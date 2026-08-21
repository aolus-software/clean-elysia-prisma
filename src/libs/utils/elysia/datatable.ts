import { defaultSort, paginationLength } from "@default";
import { BadRequestError } from "@errors";
import { DatatableType, FilterField, SortDirection } from "@types";

import { DateToolkit } from "../date";

/* The raw query object a route hands in. Deliberately wider than DatatableType,
   which is what comes back out: every field is optional because the schema
   declares defaults rather than requiring them, `sort` is `unknown` because a
   documented route narrows it to a union of literals, and the index signature
   carries the flat `filter[<key>]` parameters, which the schema cannot name. */
type QueryWithFilters = {
	page?: number;
	perPage?: number;
	search?: string;
	sort?: unknown;
	sortDirection?: SortDirection;
	[key: string]: unknown;
};

export class DatatableToolkit {
	/**
	 * Normalises a list route's query into `DatatableType`.
	 *
	 * **`url` is required, and it is what makes filters work.** Elysia strips
	 * `filter[<key>]` query parameters before the handler sees them — any route
	 * that declares a `query` schema receives only the properties that schema
	 * names, and a bracketed key is not a valid property name. So the filters are
	 * read straight off `request.url` here, and the `filter` object in the query
	 * schema is documentation only.
	 *
	 * Call it as `DatatableToolkit.parseFilter(query, request.url)`.
	 */
	static parseFilter(query: QueryWithFilters, url: string): DatatableType {
		const page: number = query.page ?? 1;
		const perPage: number = query.perPage ?? paginationLength;
		const search: string | undefined = query.search;
		const orderBy: string =
			typeof query.sort === "string" ? query.sort : defaultSort;
		const orderDirection: SortDirection = query.sortDirection ?? "desc";

		/* filter[<key>]=<value>, read off the raw URL because the validated query
		   object never carries these keys. Values stay strings: the repository owns
		   the per-key interpretation (comma-separated ids, `start,end` date ranges,
		   enum membership), and coercing here would destroy a range like
		   "2024-01-01,2024-12-31" by half-parsing it. */
		const filter: Record<string, boolean | string | Date> = {};

		for (const [key, value] of new URL(url).searchParams) {
			if (!key.startsWith("filter[") || !key.endsWith("]")) {
				continue;
			}

			const filterKey = key.slice(7, -1);
			if (!filterKey) {
				continue;
			}

			if (value === "true") {
				filter[filterKey] = true;
			} else if (value === "false") {
				filter[filterKey] = false;
			} else {
				filter[filterKey] = value;
			}
		}

		return {
			page,
			perPage,
			search,
			sort: orderBy,
			sortDirection: orderDirection,
			filter: Object.keys(filter).length > 0 ? filter : undefined,
		};
	}

	/**
	 * Splits a filter value into its comma-separated parts.
	 *
	 * Every filter value arrives as a string: an id list (`a,b`), a date range
	 * (`start,end`), or a single scalar. The repository decides which — this only
	 * splits and trims, dropping empties.
	 */
	static filterValues(value: boolean | string | Date): string[] {
		return value
			.toString()
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
	}

	/**
	 * Rejects an out-of-range value on any enum-typed filter key.
	 *
	 * Driven by the same `<entity>FilterableFields` array that documents the keys
	 * in `/docs`, so the advertised dropdown and the enforced range cannot drift.
	 * Without this the value reaches Prisma as an unchecked cast and surfaces as a
	 * 500 rather than a 400.
	 */
	static assertFilterEnums(
		filter: Record<string, boolean | string | Date> | null | undefined,
		fields: readonly FilterField[],
	): void {
		if (!filter) {
			return;
		}

		for (const field of fields) {
			if (typeof field === "string" || !("enum" in field)) {
				continue;
			}

			const raw = filter[field.field];
			if (raw === undefined) {
				continue;
			}

			const invalid = DatatableToolkit.filterValues(raw).filter(
				(value) => !field.enum.includes(value),
			);

			if (invalid.length > 0) {
				throw new BadRequestError("Invalid filter value", [
					{
						field: `filter[${field.field}]`,
						message: `Must be one of ${field.enum.join(", ")}. Received: ${invalid.join(", ")}`,
					},
				]);
			}
		}
	}

	/**
	 * Resolves a date filter value into an inclusive `[from, to]` window.
	 *
	 * `2024-03-05` matches **that whole day**, not the single instant midnight —
	 * these columns are timestamps, so an equality match on a bare date would
	 * almost never hit a row. `2024-01-01,2024-12-31` spans start-of-first-day to
	 * end-of-last-day.
	 *
	 * An unparseable date is a `BadRequestError` (400). Left unchecked it becomes
	 * an `Invalid Date`, which the driver rejects as a 500 — or worse, silently
	 * matches nothing.
	 */
	static filterDateRange(
		value: boolean | string | Date,
		field: string,
	): { from: Date; to: Date } {
		const parts = DatatableToolkit.filterValues(value);

		if (parts.length === 0 || parts.length > 2) {
			throw new BadRequestError("Invalid filter value", [
				{
					field: `filter[${field}]`,
					message:
						"Expected an ISO date, or two comma-separated dates as start,end",
				},
			]);
		}

		const parsed = parts.map((part) => {
			const date = DateToolkit.parse(part);
			if (!date.isValid()) {
				throw new BadRequestError("Invalid filter value", [
					{
						field: `filter[${field}]`,
						message: `Not a valid date: ${part}`,
					},
				]);
			}
			return date;
		});

		const from = DateToolkit.startOfDay(parsed[0]).toDate();
		const to = DateToolkit.endOfDay(parsed[parsed.length - 1]).toDate();

		if (from > to) {
			throw new BadRequestError("Invalid filter value", [
				{
					field: `filter[${field}]`,
					message: "Range start must not be after range end",
				},
			]);
		}

		return { from, to };
	}
}

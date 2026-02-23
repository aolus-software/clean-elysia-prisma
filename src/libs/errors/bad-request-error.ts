export class BadRequestError extends Error {
	code: number;
	error?: {
		field: string;
		message: string;
	}[];

	/**
	 * Represents an error when a request is malformed or contains invalid data.
	 * @param {string} message - The error message.
	 */
	constructor(
		message: string,
		error: {
			field: string;
			message: string;
		}[],
	) {
		super(message);
		this.name = "BadRequestError";
		this.code = 400;
		this.error = error;
	}

	toResponse() {
		return Response.json(
			{
				status: 400,
				success: false,
				message: this.message || "Bad Request",
				errors: this.error || [],
			},
			{
				status: 400,
			},
		);
	}
}

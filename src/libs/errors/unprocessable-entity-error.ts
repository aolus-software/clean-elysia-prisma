export class UnprocessableEntityError extends Error {
	code: number;
	error?: {
		field: string;
		message: string;
	}[];

	/**
	 * Represents an error when a user is not authorized to access a resource.
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
		this.name = "UnprocessableEntityError";
		this.code = 422;
		this.error = error;
	}

	toResponse() {
		return Response.json(
			{
				status: 422,
				success: false,
				message: this.message || "Unprocessable Entity",
				errors: this.error || [],
			},
			{
				status: 422,
			},
		);
	}
}

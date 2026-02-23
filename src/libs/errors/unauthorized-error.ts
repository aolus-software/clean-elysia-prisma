export class UnauthorizedError extends Error {
	code: number;

	/**
	 * Represents an error when a user is not authorized to access a resource.
	 * @param {string} message - The error message.
	 */
	constructor(message = "Unauthorized") {
		super(message);
		this.name = "UnauthorizedError";
		this.code = 401;
	}

	toResponse() {
		return Response.json(
			{
				status: 401,
				success: false,
				message: this.message || "Unauthorized",
			},
			{
				status: 401,
			},
		);
	}
}

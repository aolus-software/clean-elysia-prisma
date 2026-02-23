export class RateLimitError extends Error {
	constructor(public message: string = "rate-limited") {
		super(message);
	}

	toResponse() {
		return Response.json(
			{
				status: 429,
				success: false,
				message: this.message || "Too Many Requests",
			},
			{
				status: 429,
			},
		);
	}
}

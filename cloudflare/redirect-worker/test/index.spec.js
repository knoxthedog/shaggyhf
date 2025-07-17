import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';


describe('Redirect worker', () => {
	it('redirects shaggyhf.com to www.shaggyhf.com', async () => {
		const request = new Request('https://shaggyhf.com/some/path?foo=bar');
		const ctx = createExecutionContext();

		const response = await worker.fetch(request, {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(301);
		expect(response.headers.get('Location')).toBe('https://www.shaggyhf.com/some/path?foo=bar');
	});

	// it('passes through requests for www.shaggyhf.com', async () => {
	// 	const request = new Request('https://www.shaggyhf.com/some/path');
	// 	const ctx = createExecutionContext();
	//
	// 	const response = await worker.fetch(request, {}, ctx);
	// 	await waitOnExecutionContext(ctx);
	//
	// 	// Since we're not mocking fetch(), this will actually try to fetch www.shaggyhf.com,
	// 	// so a simple assertion like "response.status is not 301" is safe for unit testing.
	// 	expect(response.status).not.toBe(301);
	// });
});


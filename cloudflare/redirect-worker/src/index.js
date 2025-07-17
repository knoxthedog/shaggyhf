export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.hostname === 'shaggyhf.com') {
			url.hostname = 'www.shaggyhf.com';
			return Response.redirect(url.toString(), 301);
		}

		return fetch(request);
	}
}

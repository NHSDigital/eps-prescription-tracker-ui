// __tests__/axios.test.tsx
import http from '@/helpers/axios';
import MockAdapter from 'axios-mock-adapter';

jest.mock('uuid', () => ({
    // Always return the same UUID so we can test it
    v4: jest.fn().mockReturnValue('test-uuid'),
}));

describe('HTTP Axios Instance', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(http);
    });

    afterEach(() => {
        mock.reset();
    });

    it('adds X-request-id header with a UUID on every request', async () => {
        mock.onGet('/test').reply((config) => {
            expect(config.headers['X-request-id']).toBe('test-uuid');
            return [200, { success: true }];
        });

        const response = await http.get('/test');

        expect(response.status).toBe(200);
        expect(response.data).toEqual({ success: true });
    });

    it('retries up to 3 times for mixed errors, then succeeds', async () => {
        mock
            .onGet('/test')
            .replyOnce(404)
            .onGet('/test')
            .replyOnce(502)
            .onGet('/test')
            .replyOnce(413)
            .onGet('/test')
            .replyOnce(200, { retried: true });

        const response = await http.get('/test');

        expect(response.status).toBe(200);
        expect(response.data).toEqual({ retried: true });

        expect(mock.history.get.length).toBe(4);
    });

    it('fails after 3 retries if 401 persists', async () => {
        mock.onGet('/test').reply(401);

        await expect(http.get('/test')).rejects.toThrow();

        // Check how many calls were made (should be 4: initial + 3 retries)
        expect(mock.history.get.length).toBe(4);
    });
});

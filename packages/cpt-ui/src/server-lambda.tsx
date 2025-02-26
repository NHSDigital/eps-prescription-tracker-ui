import { LambdaFunctionURLHandler } from "aws-lambda";
import { prerenderToNodeStream } from 'react-dom/static';
import { StaticRouter } from 'react-router';
import App from './App';

export const handler: LambdaFunctionURLHandler = async (event) => {
    const { prelude } = await prerenderToNodeStream(
        <StaticRouter location={`${event.rawPath}?${event.rawQueryString}`} basename="/site">
            <App />
        </StaticRouter>,
        {
            bootstrapScripts: ['/hydrate.js']
        }
    );
    const body = await new Promise<string>((resolve, reject) => {
        let data = '';
        prelude.on('data', chunk => {
            data += chunk;
        });
        prelude.on('end', () => resolve(data));
        prelude.on('error', reject);
    });
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "text/html"
        },
        body
    }
}

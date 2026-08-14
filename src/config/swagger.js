import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Sale CRM API',
            version: '1.0.0',
            description: 'API documentation for the Sale CRM product (Deals, Tasks, Meetings, Incentives, Tickets, Reports, Dashboard).',
        },
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'access_token',
                },
            },
        },
        security: [{ cookieAuth: [] }],
    },
    apis: ['./src/routes/*.js', './src/index.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

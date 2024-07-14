import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Auth Service Documentation',
			social: {
				github: 'https://github.com/BharatSahAIyak/bhasai-auth-service',
			},
			sidebar: [
				{
					label: 'API documentation',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Applications', slug: 'api/applications' },
						{ label: 'Groups', slug: 'api/groups' },
						{ label: 'Keys', slug: 'api/keys' },
						{ label: 'OTP ', slug: 'api/otp' },
						{ label: 'Refresh Token ', slug: 'api/refreshtoken' },
						{ label: 'Tenants ', slug: 'api/tenants' },
						{ label: 'Users', slug: 'api/users' },
					],
				},
				{
					label : 'Guides',
					items : [
						{ label: 'Guide', slug: 'guides/readme' },
						{ label: 'OIDC Proxy Guide', slug: 'guides/configure-oidc-proxy' },
						{ label: 'Minio Guide', slug: 'guides/minio-openid-auth' },
						{ label: 'Setup Guide', slug: 'guides/setup' },
						{ label: 'Kickstart Guide', slug: 'guides/kickstart' },

					]
				},
				{
					label : 'Database Documentation',
					items : [
						{ label : 'Database Schema', slug : 'reference/dbschema' },
						{ label : 'Database Diagram', slug : 'reference/dbdiagram' },
					]					
				}
			],
		}),
	],
});

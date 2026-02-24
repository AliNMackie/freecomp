import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/admin/'],
            },
            {
                userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'CCBot', 'Google-Extended'],
                allow: '/',
            }
        ],
        sitemap: 'https://iaifreecomp.netlify.app/sitemap.xml',
    };
}

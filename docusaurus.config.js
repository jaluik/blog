module.exports = {
  title: 'jaluik的个人博客',
  tagline: 'jaluik的个人博客',
  url: 'https://www.jaluik.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  projectName: 'log', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Jaluik',
      logo: {
        alt: 'log',
        src: 'img/logo.png',
      },
      items: [
        {
          to: 'docs/server/gitActionsDeploy',
          activeBasePath: 'docs',
          label: '服务器',
          position: 'left',
        },
        // { to: 'blog', label: 'Blog', position: 'left' },
        {
          href: 'https://github.com/jaluik',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} ❤️ <a href="https://github.com/jaluik">Jaluik</a>`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/jaluik/blog/tree/main/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl: 'https://github.com/jaluik/blog',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.scss'),
        },
      },
    ],
  ],
  plugins: [
    'docusaurus-plugin-sass',
    // ... Your other plugins.
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en', 'zh'],
        translations: {
          search_placeholder: '搜索',
          see_all_results: '查看所有结果',
          no_results: '暂无结果。',
          search_results_for: '搜索"{{ keyword }}"',
          search_the_documentation: '搜索文档',
          count_documents_found: '找到{{ count }}',
          count_documents_found_plural: '找到{{ count }}个结果',
          no_documents_were_found: '暂无结果。',
        },
      },
    ],
  ],
}

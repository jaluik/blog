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
          to: 'docs/frontEnd/sourceCode/redux',
          activeBasePath: 'docs/frontEnd',
          label: '前端漫谈',
          position: 'left',
        },
        {
          to: 'docs/backEnd/python/pythonProxyPool',
          activeBasePath: 'docs/backEnd',
          label: '后端浅析',
          position: 'left',
        },
        {
          to: 'docs/operations/gitActionsDeploy',
          activeBasePath: 'docs/operations',
          label: '运维之路',
          position: 'left',
        },
        {
          href: 'https://github.com/jaluik',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `<div>Copyright © ${new Date().getFullYear()} ❤️ <a href="https://github.com/jaluik">Jaluik</a></div>
      <div><a href="https://beian.miit.gov.cn/" target="_blank">渝ICP备2023013586号</a></div>
      `,
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
      },
    ],
  ],
}

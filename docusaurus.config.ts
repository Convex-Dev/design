import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Convex',
  tagline: 'Home of Lattice Technology',
  favicon: 'img/Convex.png',

  // Set the production url of your site here
  url: 'https://docs.convex.world',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Convex-Dev', // Usually your GitHub org/user name.
  projectName: 'design', // Usually your repo name.

  // Recommended for GitHub pages
  trailingSlash: false,

  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
onBrokenMarkdownLinks: 'warn'
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Convex-Dev/design/tree/develop',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/Convex-Dev/design/tree/develop',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/Convex.png',
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 3,
    },
    navbar: {
      title: 'Convex Docs',
      logo: {
        alt: 'Convex Logo',
        src: 'img/Convex.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'overviewSidebar',
          position: 'left',
          label: 'Overview',
        },
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Tutorial',
        },
        {
          type: 'docSidebar',
          sidebarId: 'productsSidebar',
          position: 'left',
          label: 'Products',
        },
        {
          type: 'docSidebar',
          sidebarId: 'cadsSidebar',
          position: 'left',
          label: 'CADs',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/Convex-Dev/design',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Tutorial',
              to: '/docs/intro',
            },
            {
              label: 'CADs',
              to: '/docs/cad/0000cads',
            }
          ],
        },
        {
          title: 'Tools',
          items: [
            {
              label: 'REPL',
              to: '/docs/tools/convex-repl',
            },
            {
              label: 'Explorer',
              to: 'https://peer.convex.live/explorer',
            },
          ],
        },
        {
          title: 'Community',
          items: [
  
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/convex',
            },
            {
              label: 'Discord',
              href: 'https://discord.com/invite/xfYGq4CT7v',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/convex_world',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'convex.world',
              href: 'https://convex.world',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Convex-Dev',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Convex Foundation. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.vsLight,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['powershell','clojure','java']
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

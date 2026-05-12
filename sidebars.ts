import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  firstSidebar: {
    源码学习: [
      'frontEnd/cssTrick',
      'frontEnd/sourceCode/redux',
      'frontEnd/sourceCode/vue',
      'frontEnd/sourceCode/vue2',
      'frontEnd/sourceCode/vue3',
    ],
    工具集: ['tools/vscode', 'frontEnd/vim'],
  },
  secondSidebar: {
    python: ['backEnd/python/pythonProxyPool', 'backEnd/python/uvBestPractices'],
  },
  thirdSidebar: ['operations/gitActionsDeploy', 'operations/k8s'],
  aiSidebar: {
    资源: ['ai/openSourceAiResources'],
  },
}

export default sidebars

import { Texts } from './texts';

export const PT: Texts = {
  meta: {
    title: 'Dânton Moura · Desenvolvedor Full Stack',
    description:
      'Dânton Moura, desenvolvedor full stack: C#, .NET, JavaScript, Angular, React e Ionic. Conheça o portfólio, os serviços e entre em contato.',
  },
  hashes: { profile: 'perfil', services: 'servicos', portfolio: 'portfolio' },
  language: 'Idioma',
  brand: { role: 'Dev Full Stack', home: 'Voltar ao início' },
  tabs: {
    profile: 'Perfil',
    portfolio: 'Portfólio',
    services: 'Serviços',
    openProfile: 'Abrir perfil',
    closeProfile: 'Fechar perfil',
  },
  social: 'Redes sociais',
  profile: {
    hello: 'Olá, sou',
    about: (years) =>
      `Formado em Sistemas de Informação pelo IFES, com 3 anos de experiência como designer e ${years} anos como programador, a maior parte deles no ecossistema Microsoft: C#, .NET e Web API.`,
    invite: 'Se você quer levar o seu projeto a outro nível, fale comigo.',
    cta: 'Fale comigo',
    skills: 'Skills',
    skillColumn: 'skill',
    levelColumn: 'nível',
  },
  services: {
    mvp: {
      title: 'Produto Mínimo Viável (MVP)',
      paragraphs: [
        '<strong>Eric Ries</strong>, no livro <a href="https://pt.wikipedia.org/wiki/Lean_startup" target="_blank" rel="noopener noreferrer"><em>A Startup Enxuta</em></a>, apresenta um conceito muito útil para quem tem uma ideia de negócio ou de melhoria de processo.',
        'Muitas vezes, quando surge uma ideia, o empreendedor tenta implementá-la com todos os recursos e com uma perfeição que inviabiliza o próprio projeto. Na pior das hipóteses, a ideia é implementada, mas não tem a adesão esperada e gera prejuízo.',
      ],
      bullets: [
        'Mentoria para encontrarmos juntos uma solução enxuta e viável.',
        'Desenvolvimento da solução e condução da melhor implementação possível.',
        'Evolução contínua até um software completo, que atenda a todas as necessidades.',
      ],
    },
    rfid: {
      title: 'Middleware RFID',
      paragraphs: [
        'Um mediador entre os equipamentos receptores de sinal RFID e o software final.',
        'O middleware é mantido por mim e serve de apoio para empresas que querem abstrair a parte de RFID dos seus sistemas.',
      ],
      imageAlt:
        'Diagrama: antenas RFID no caixa e no estoque ligadas a um leitor RFID, que se conecta ao computador pela rede',
    },
    totem: {
      title: 'Totem de Autoatendimento',
      paragraphs: [
        'Desenvolvi um software que gerencia uma cabine fotográfica para eventos como casamentos, aniversários e eventos corporativos.',
        'Também tenho outros totens de autoatendimento que facilitam o dia a dia do comércio.',
      ],
    },
  },
  enlargeImage: 'Ampliar imagem',
  projects: {
    ambev: {
      title: 'Ambev',
      summary:
        'Gerenciamento de questionários para pesquisas de opinião. Arquitetei o projeto para permitir diversos tipos de perguntas, tudo de forma genérica e orientada a objetos.',
      tags: ['Arquitetura', 'Web'],
    },
    'white-martins': {
      title: 'White Martins',
      summary:
        'Ferramenta do grupo White Martins para calcular orçamentos. Atuei na manutenção do software e na construção de um ambiente de entrega contínua, com um código manutenível.',
      tags: ['Manutenção', 'Entrega contínua'],
    },
    fapes: {
      title: 'FAPES e NIADES',
      summary: 'Arquitetei um sistema web SaaS para diversos comitês de bacias hidrográficas.',
      tags: ['SaaS', 'Arquitetura'],
    },
    unimed: {
      title: 'Unimed',
      summary:
        'Desenvolvimento de aplicativo híbrido para a Unimed, seguindo com precisão a especificação de design.',
      tags: ['App híbrido', 'Mobile'],
    },
    mdk: {
      title: 'MDK Exames',
      summary: 'Aplicativo de web scraping de exames laboratoriais.',
      tags: ['Web scraping', 'Mobile'],
    },
    solverup: {
      title: 'Solverup',
      summary: 'Criação do site da Solverup, com sistema de registro de demandas.',
      tags: ['Website'],
    },
    selfstyle: {
      title: 'SelfStyle',
      summary: 'Criação e design do site da SelfStyle.',
      tags: ['Website', 'Design'],
    },
  },
  portfolio: {
    enlarge: (image, title) => `Ampliar imagem ${image} de ${title}`,
    categories: 'Categorias',
    previous: 'Projeto anterior',
    next: 'Próximo projeto',
  },
  lightbox: {
    close: 'Fechar imagem',
    previous: 'Imagem anterior',
    next: 'Próxima imagem',
    imageOf: (title, image, total) => `${title} — imagem ${image} de ${total}`,
  },
};

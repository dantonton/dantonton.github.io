import { Texts } from './texts';

export const EN: Texts = {
  meta: {
    title: 'Dânton Moura · Full Stack Developer',
    description:
      'Dânton Moura, full stack developer: C#, .NET, JavaScript, Angular, React and Ionic. See the portfolio and services, and get in touch.',
  },
  hashes: { profile: 'profile', services: 'services', portfolio: 'portfolio' },
  language: 'Language',
  brand: { role: 'Full Stack Dev', home: 'Back to start' },
  tabs: {
    profile: 'Profile',
    portfolio: 'Portfolio',
    services: 'Services',
    openProfile: 'Open profile',
    closeProfile: 'Close profile',
  },
  social: 'Social links',
  profile: {
    hello: "Hi, I'm",
    about: (years) =>
      `I hold a degree in Information Systems from IFES, with 3 years of experience as a designer and ${years} years as a developer, mostly in the Microsoft ecosystem: C#, .NET and Web API.`,
    invite: "If you want to take your project to the next level, let's talk.",
    cta: 'Get in touch',
    skills: 'Skills',
    skillColumn: 'skill',
    levelColumn: 'level',
  },
  services: {
    mvp: {
      title: 'Minimum Viable Product (MVP)',
      paragraphs: [
        '<strong>Eric Ries</strong>, in his book <a href="https://en.wikipedia.org/wiki/Lean_startup" target="_blank" rel="noopener noreferrer"><em>The Lean Startup</em></a>, presents a very useful concept for anyone with a business idea or a process improvement in mind.',
        "Often, when an idea comes up, entrepreneurs try to build it with every feature and a level of perfection that makes the project unfeasible. In the worst case, the idea gets built but doesn't get the expected adoption, and it causes losses.",
      ],
      bullets: [
        'Mentoring to find a lean, viable solution together.',
        'Building the solution and leading the best possible implementation.',
        'Continuous evolution into complete software that meets every need.',
      ],
    },
    rfid: {
      title: 'RFID Middleware',
      paragraphs: [
        'A mediator between RFID signal receivers and the end software.',
        'I maintain this middleware, and it supports companies that want to abstract the RFID layer away from their systems.',
      ],
      imageAlt:
        'Diagram: RFID antennas at the checkout and in the stockroom connected to an RFID reader, which connects to the computer over the network',
    },
    totem: {
      title: 'Self-Service Kiosk',
      paragraphs: [
        'I built software that manages a photo booth for events such as weddings, birthdays and corporate events.',
        'I also have other self-service kiosks that make day-to-day retail easier.',
      ],
    },
  },
  enlargeImage: 'Enlarge image',
  projects: {
    ambev: {
      title: 'Ambev',
      summary:
        'Questionnaire management for opinion surveys. I designed the architecture to support many question types, all in a generic, object-oriented way.',
      tags: ['Architecture', 'Web'],
    },
    'white-martins': {
      title: 'White Martins',
      summary:
        'A tool for the White Martins group to calculate quotes. I worked on maintaining the software and on building a continuous delivery pipeline, with maintainable code.',
      tags: ['Maintenance', 'Continuous delivery'],
    },
    fapes: {
      title: 'FAPES and NIADES',
      summary: 'I designed the architecture of a SaaS web system for several river basin committees.',
      tags: ['SaaS', 'Architecture'],
    },
    unimed: {
      title: 'Unimed',
      summary: 'Hybrid app development for Unimed, following the design specification precisely.',
      tags: ['Hybrid app', 'Mobile'],
    },
    mdk: {
      title: 'MDK Exames',
      summary: 'Web scraping app for lab test results.',
      tags: ['Web scraping', 'Mobile'],
    },
    solverup: {
      title: 'Solverup',
      summary: 'Website for Solverup, with a system for logging client requests.',
      tags: ['Website'],
    },
    selfstyle: {
      title: 'SelfStyle',
      summary: 'Design and development of the SelfStyle website.',
      tags: ['Website', 'Design'],
    },
  },
  portfolio: {
    enlarge: (image, title) => `Enlarge image ${image} of ${title}`,
    categories: 'Categories',
    previous: 'Previous project',
    next: 'Next project',
  },
  lightbox: {
    close: 'Close image',
    previous: 'Previous image',
    next: 'Next image',
    imageOf: (title, image, total) => `${title} — image ${image} of ${total}`,
  },
};

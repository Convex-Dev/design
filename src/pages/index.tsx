import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const heroCode = `;; Launch your own digital currency — one line of Convex Lisp
(def token
  (deploy [(@convex.fungible/build-token {:supply 1000000})]))

;; Transfer instantly — zero block delay
(@convex.fungible/transfer token #42 1000)`;

function HomepageHeader() {
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <Heading as="h1" className="hero__title">
              Build on the Stateful Internet
            </Heading>
            <p className="hero__subtitle">
              Convex is the decentralised lattice platform for real-time
              applications: zero block delay, a single global state, and
              DeFi in one line of code.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--secondary button--lg"
                to="/docs/tutorial/quickstart">
                Start Building
              </Link>
              <Link
                className="button button--outline button--secondary button--lg"
                to="/docs/intro">
                Why Convex?
              </Link>
            </div>
          </div>
          <div className={styles.heroCode}>
            <CodeBlock language="clojure">{heroCode}</CodeBlock>
          </div>
        </div>
      </div>
    </header>
  );
}

type Pathway = {
  title: string;
  description: string;
  links: {label: string; to: string}[];
};

const pathways: Pathway[] = [
  {
    title: 'Build an application',
    description:
      'Create dApps with instant transactions, using client SDKs or on-chain Convex Lisp.',
    links: [
      {label: 'Quick Start', to: '/docs/tutorial/quickstart'},
      {label: 'Client SDKs', to: '/docs/tutorial/client-sdks'},
      {label: 'Convex Lisp', to: '/docs/tutorial/convex-lisp'},
    ],
  },
  {
    title: 'Connect AI agents',
    description:
      'Every peer is an MCP gateway: agents can hold accounts, own assets and transact directly.',
    links: [
      {label: 'Convex MCP', to: '/docs/products/convex-mcp'},
      {label: 'Agent Guide', to: '/docs/tutorial/agents'},
    ],
  },
  {
    title: 'Run infrastructure',
    description:
      'Operate a peer, stake on the network and help secure the lattice.',
    links: [
      {label: 'Peer Operations', to: '/docs/tutorial/peer-operations'},
      {label: 'Peer Container', to: '/docs/products/convex-peer'},
      {label: 'Convex CLI', to: '/docs/products/convex-cli'},
    ],
  },
  {
    title: 'Understand the design',
    description:
      'Read the formal specifications and research behind Convex.',
    links: [
      {label: 'Key Concepts', to: '/docs/overview/concepts'},
      {label: 'White Paper', to: '/docs/overview/convex-whitepaper'},
      {label: 'CADs', to: '/docs/cad/0000cads'},
    ],
  },
];

function PathwaysSection() {
  return (
    <section className={styles.pathways}>
      <div className="container">
        <Heading as="h2" className={styles.pathwaysTitle}>
          Where do you want to go?
        </Heading>
        <div className="row">
          {pathways.map((p) => (
            <div key={p.title} className="col col--3 margin-bottom--lg">
              <div className={clsx('card', styles.pathwayCard)}>
                <div className="card__header">
                  <Heading as="h3">{p.title}</Heading>
                </div>
                <div className="card__body">
                  <p>{p.description}</p>
                  <ul className={styles.pathwayLinks}>
                    {p.links.map((l) => (
                      <li key={l.to}>
                        <Link to={l.to}>{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className={styles.community}>
      <div className="container text--center">
        <Heading as="h2">Join the community</Heading>
        <p>
          Convex is open source and built in the open. Get help, share what
          you are building, or contribute to the platform itself.
        </p>
        <div className={styles.communityButtons}>
          <Link
            className="button button--primary button--lg"
            href="https://discord.com/invite/xfYGq4CT7v">
            Discord
          </Link>
          <Link
            className="button button--outline button--primary button--lg"
            href="https://github.com/Convex-Dev">
            GitHub
          </Link>
          <Link
            className="button button--outline button--primary button--lg"
            to="/blog">
            Blog
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Documentation for Convex — the decentralised lattice platform powering the Stateful Internet.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <PathwaysSection />
        <CommunitySection />
      </main>
    </Layout>
  );
}

import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Lattice Technology',
    Svg: require('@site/static/img/Torus-82.svg').default,
    description: (
      <>
        The Lattice is the innovation at the heart of Convex — decentralised,
        infinitely scalable, cryptographically secure data structures that
        power everything from consensus to file systems.
      </>
    ),
  },
  {
    title: 'Developer Power',
    Svg: require('@site/static/img/Torus-11.svg').default,
    description: (
      <>
        Fully interactive REPL development, idiomatic SDKs for TypeScript,
        Java and Python, and the power of &quot;One Line DeFi&quot; with
        on-chain libraries.
      </>
    ),
  },
  {
    title: 'Real-Time Performance',
    Svg: require('@site/static/img/Torus-81.svg').default,
    description: (
      <>
        Zero block delay and near-instant transaction confirmation — build
        real-time experiences that feel like the web, with the guarantees of
        decentralisation.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center convex-svg-colour">
        <Svg className={styles.featureSvg} stroke="#ffffff" role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
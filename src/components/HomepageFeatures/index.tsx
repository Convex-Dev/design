import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import DocusaurusSvg from './docusaurus.svg';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Lattice Technology',
    Svg: require('@site/static/img/Torus-82.svg').default,
    description: (
      <>
        The Lattice is the innovation at the heart of Convex - decentralised, infinitely scalable, cryptographically secure. 
      </>
    ),
  },
  {
    title: 'Developer Power',
    Svg: require('@site/static/img/Torus-11.svg').default,
    description: (
      <>
        Convex gives developers superpowers: fully interactive REPL development and the power of "One Line DeFi"
      </>
    ),
  },
  {
    title: 'Blazing Performance',
    Svg: require('@site/static/img/Torus-81.svg').default,
    description: (
      <>
        With zero block delay and near-instant transaction confirmation, you can build the perfect experience for your users. 
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

export default function HomepageFeatures(): JSX.Element {
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
import HeroPanel from '../../components/visuals/HeroPanel';
import AuthForm from '../../components/auth/AuthForm';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  return (
    <div className={styles.container}>
      {/* Left Visual Area (Refined Narrow Sidebar with Feature Tags) */}
      <section className={styles.leftPanel}>
        <HeroPanel />
      </section>

      {/* Right Interactive Area (Auth Toggle Form: Login/Signup) */}
      <section className={styles.rightPanel}>
        <AuthForm />
      </section>
    </div>
  );
};

export default LandingPage;

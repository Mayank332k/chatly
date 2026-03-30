import AuthForm from '../../components/auth/AuthForm';
import styles from './LandingPage.module.css';

const LandingPage = () => {
  return (
    <div className={styles.container}>
      <div className={styles.authWrapper}>
        <AuthForm />
      </div>
    </div>
  );
};

export default LandingPage;

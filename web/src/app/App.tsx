import { HomeScreen } from '@/features/home';
import { AuthModal, useAuth } from '@/features/auth';
import { SplashScreen } from '@/components';

function App() {
  const { isLoading } = useAuth();

  return (
    <>
      <SplashScreen isLoading={isLoading} />
      <HomeScreen />
      <AuthModal />
    </>
  );
}

export default App;

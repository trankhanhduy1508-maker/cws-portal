import { useEffect, useState } from 'react';
import App from './App.jsx';
import AdminScreen from './pages/AdminScreen.jsx';
import { ROOT_ROUTE, resolveRootRoute } from './routing/rootRoute.js';

/**
 * Root shell router.
 *
 * `App.jsx` historically reads `window.location` imperatively. A hash change
 * does not itself cause React to render, so the already-mounted customer tree
 * can remain visible after navigation to an Admin hash. This boundary owns
 * top-level Admin-vs-app selection and explicitly subscribes to browser
 * navigation events.
 */
export default function RootRouter() {
  const [route, setRoute] = useState(() => resolveRootRoute(window.location));

  useEffect(() => {
    const syncRoute = () => setRoute(resolveRootRoute(window.location));

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    // Reconcile once after the effect is installed in case navigation occurred
    // between the initial render and subscription.
    syncRoute();

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  if (route === ROOT_ROUTE.ADMIN) {
    return <AdminScreen />;
  }

  return <App />;
}

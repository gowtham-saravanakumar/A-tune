import { PlayerProvider } from "@/lib/PlayerContext";
import PlayerHost from "@/components/PlayerHost";
import Layout from "@/components/Layout";
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <PlayerProvider>
      {/* Rendered once, outside <Component/>, so it survives every route
          change — this is what keeps a song playing as you move around
          the app instead of it restarting on every page. */}
      <PlayerHost />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </PlayerProvider>
  );
}

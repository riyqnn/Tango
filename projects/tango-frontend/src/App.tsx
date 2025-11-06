import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react';
import { SnackbarProvider } from 'notistack';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Home from './Home';
import RoomPage from './room/[id]/page';
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs';

// Setup supported wallets
let supportedWallets: SupportedWallet[];

if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment();
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ];
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // Bisa tambah WalletConnect v2 kalau mau
  ];
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment();

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  });

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        {/* ✅ Router Wrapper */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Dynamic route for game room */}
            <Route path="/room/:id" element={<RoomPage />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  );
}

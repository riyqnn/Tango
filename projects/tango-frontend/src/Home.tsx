import React, { useState, useEffect } from 'react';
import { TrendingUp, Lock, Award, Info, ArrowRight, CheckCircle, AlertCircle, Wallet, ExternalLink } from 'lucide-react';
import algosdk from 'algosdk';
import { useWallet } from '@txnlab/use-wallet-react';

// Environment configuration helper
const getAlgodConfig = () => {
  const server = import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
  const port = import.meta.env.VITE_ALGOD_PORT || '';
  const token = import.meta.env.VITE_ALGOD_TOKEN || '';
  return { server, port, token };
};

// Contract configuration from environment
const CONTRACT_CONFIG = {
  appId: Number(import.meta.env.VITE_CONTRACT_APP_ID) || 749014050,
  appAddress: import.meta.env.VITE_CONTRACT_APP_ADDRESS || 'D4V44T2PXCDL3RZHAAQAWVYK3OZHERJ3JVIGRWS24CMMITGVPPYT2RAGU4',
};

const IJARAH_CONSTANTS = {
  ANNUAL_UJRAH_RATE_BP: 300,
  SECONDS_PER_YEAR: 31557600,
  BASIS_POINTS_DIVISOR: 10000,
  MICROALGOS_PER_ALGO: 1000000,
  MIN_LEASE_DEPOSIT: 1000000,
};

const StakingPage = () => {
  const { activeAddress, transactionSigner } = useWallet();

  const [stakeAmount, setStakeAmount] = useState('');
  const [duration, setDuration] = useState('30');
  const [estimatedRewards, setEstimatedRewards] = useState(0);
  const [activeTab, setActiveTab] = useState('stake');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Blockchain state
  const [walletBalance, setWalletBalance] = useState(0);
  const [stakedBalance, setStakedBalance] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [ijarahInfo, setIjarahInfo] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [algodClient, setAlgodClient] = useState(null);

  const annualRate = 3;

  // Initialize Algorand client from environment
  useEffect(() => {
    const config = getAlgodConfig();
    const algod = new algosdk.Algodv2(config.token, config.server, config.port);
    setAlgodClient(algod);
    console.log('🔗 Algod client initialized:', config.server);
  }, []);

  // Calculate estimated rewards
  useEffect(() => {
    if (stakeAmount && !isNaN(parseFloat(stakeAmount))) {
      const amount = parseFloat(stakeAmount);
      const days = parseInt(duration);
      const estimated = (amount * annualRate / 100) * (days / 365);
      setEstimatedRewards(estimated);
    } else {
      setEstimatedRewards(0);
    }
  }, [stakeAmount, duration]);

  // Fetch wallet balance and ijarah info
  useEffect(() => {
    if (activeAddress && algodClient) {
      fetchAccountData();
    }
  }, [activeAddress, algodClient]);

  const fetchAccountData = async () => {
    if (!activeAddress || !algodClient) return;

    setIsLoadingData(true);
    try {
      // Get account info
      const accountInfo = await algodClient.accountInformation(activeAddress).do();
      const balance = Number(accountInfo.amount) / IJARAH_CONSTANTS.MICROALGOS_PER_ALGO;
      setWalletBalance(balance);
      console.log('💰 Wallet balance:', balance, 'ALGO');

      // Get ijarah info from contract
      await fetchIjarahInfo();

    } catch (error) {
      console.error('❌ Error fetching account data:', error);
      showNotification('Failed to fetch account data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchIjarahInfo = async () => {
    if (!activeAddress || !algodClient) return;

    try {
      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create ABI method for getting ijarah info
      const method = new algosdk.ABIMethod({
        name: 'get_my_ijarah_info',
        args: [],
        returns: { type: '(uint64,uint64,uint64)' }
      });

      const atc = new algosdk.AtomicTransactionComposer();

      // Create box reference
      const boxName = new Uint8Array(Buffer.from(`ijarah_${activeAddress}`, 'utf-8'));

      atc.addMethodCall({
        appID: CONTRACT_CONFIG.appId,
        method: method,
        sender: activeAddress,
        suggestedParams,
        signer: algosdk.makeEmptyTransactionSigner(),
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        boxes: [
          { appIndex: CONTRACT_CONFIG.appId, name: boxName }
        ],
      });

      // Simulate the transaction
      const simResult = await atc.simulate(algodClient);

      if (simResult?.methodResults?.[0]?.returnValue) {
        const [principal, startTime, unclaimed] = simResult.methodResults[0].returnValue;

        const principalAlgo = Number(principal) / IJARAH_CONSTANTS.MICROALGOS_PER_ALGO;
        const unclaimedAlgo = Number(unclaimed) / IJARAH_CONSTANTS.MICROALGOS_PER_ALGO;

        setStakedBalance(principalAlgo);
        setTotalRewards(unclaimedAlgo);

        setIjarahInfo({
          principal: Number(principal),
          startTime: Number(startTime),
          unclaimed: Number(unclaimed)
        });

        console.log('📊 Ijarah info loaded:', { principalAlgo, unclaimedAlgo, startTime: Number(startTime) });
      } else {
        // No active lease
        console.log('ℹ️ No active lease found');
        setStakedBalance(0);
        setTotalRewards(0);
        setIjarahInfo(null);
      }
    } catch (error) {
      console.log('ℹ️ No active lease or error:', error.message);
      setStakedBalance(0);
      setTotalRewards(0);
      setIjarahInfo(null);
    }
  };

  const handleStake = async () => {
    // Validation checks
    if (!activeAddress || !transactionSigner) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!algodClient) {
      showNotification('Algorand client not ready', 'error');
      return;
    }

    if (!stakeAmount || parseFloat(stakeAmount) < 1) {
      showNotification('Minimum stake is 1 ALGO', 'error');
      return;
    }

    const amountInMicroAlgos = Math.floor(parseFloat(stakeAmount) * IJARAH_CONSTANTS.MICROALGOS_PER_ALGO);

    if (amountInMicroAlgos < IJARAH_CONSTANTS.MIN_LEASE_DEPOSIT) {
      showNotification('Minimum stake is 1 ALGO', 'error');
      return;
    }

    if (amountInMicroAlgos > walletBalance * IJARAH_CONSTANTS.MICROALGOS_PER_ALGO) {
      showNotification('Insufficient balance', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🚀 Starting stake for address:', activeAddress);
      console.log('💵 Amount:', parseFloat(stakeAmount), 'ALGO');

      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create ABI method
      const method = new algosdk.ABIMethod({
        name: 'lease_validation_rights',
        args: [{ type: 'pay', name: 'payment' }],
        returns: { type: 'string' }
      });

      // Box reference
      const boxName = new Uint8Array(Buffer.from(`ijarah_${activeAddress}`, 'utf-8'));

      // 1. Create payment transaction
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: activeAddress,
        to: CONTRACT_CONFIG.appAddress,
        amount: amountInMicroAlgos,
        suggestedParams,
      });

      // 2. Create app call transaction
      const appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: activeAddress,
        appIndex: CONTRACT_CONFIG.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [method.getSelector()],
        boxes: [
          { appIndex: CONTRACT_CONFIG.appId, name: boxName }
        ],
        suggestedParams: {
          ...suggestedParams,
          fee: 2000,
          flatFee: true,
        },
      });

      // 3. Group transactions
      const txns = [paymentTxn, appCallTxn];
      algosdk.assignGroupID(txns);

      console.log('✅ Transactions created and grouped');

      // 4. Sign transactions using transactionSigner from useWallet
      const signedTxns = await transactionSigner(txns, [0, 1]);

      console.log('✍️ Transactions signed');

      // 5. Send transactions
      const { txId } = await algodClient.sendRawTransaction(signedTxns).do();

      console.log('📤 Transaction sent. TxID:', txId);

      // 6. Wait for confirmation
      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log('✅ Transaction confirmed!');

      showNotification('Staking successful! Your lease has started.', 'success');
      setStakeAmount('');

      // Refresh account data
      await fetchAccountData();

    } catch (error) {
      console.error('❌ Staking error:', error);

      if (error.message?.includes('overspend')) {
        showNotification('Insufficient balance for transaction', 'error');
      } else if (error.message?.includes('rejected')) {
        showNotification('Transaction was rejected in wallet', 'error');
      } else if (error.message?.includes('cancelled')) {
        showNotification('Transaction was cancelled', 'error');
      } else {
        showNotification(error?.message || 'Failed to stake. Please try again.', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!activeAddress || !transactionSigner || !algodClient || !ijarahInfo) {
      showNotification('No rewards to claim', 'error');
      return;
    }

    if (totalRewards <= 0) {
      showNotification('No rewards available to claim yet', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💎 Claiming rewards...');

      const suggestedParams = await algodClient.getTransactionParams().do();

      const method = new algosdk.ABIMethod({
        name: 'claim_ujrah',
        args: [],
        returns: { type: 'string' }
      });

      const boxName = new Uint8Array(Buffer.from(`ijarah_${activeAddress}`, 'utf-8'));

      const txn = algosdk.makeApplicationCallTxnFromObject({
        from: activeAddress,
        appIndex: CONTRACT_CONFIG.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [method.getSelector()],
        boxes: [
          { appIndex: CONTRACT_CONFIG.appId, name: boxName }
        ],
        suggestedParams: {
          ...suggestedParams,
          fee: 2000,
          flatFee: true,
        },
      });

      const signedTxn = await transactionSigner([txn], [0]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

      console.log('📤 Claim transaction sent:', txId);

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log('✅ Rewards claimed successfully!');

      showNotification('Rewards claimed successfully!', 'success');
      await fetchAccountData();

    } catch (error) {
      console.error('❌ Claim error:', error);
      showNotification(error?.message || 'Failed to claim rewards', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!activeAddress || !transactionSigner || !algodClient || !ijarahInfo) {
      showNotification('No active stake to withdraw', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🏦 Withdrawing stake...');

      const suggestedParams = await algodClient.getTransactionParams().do();

      const method = new algosdk.ABIMethod({
        name: 'terminate_lease',
        args: [{ type: 'uint64', name: 'withdrawal_amount' }],
        returns: { type: 'string' }
      });

      const boxName = new Uint8Array(Buffer.from(`ijarah_${activeAddress}`, 'utf-8'));

      // Encode withdrawal amount
      const withdrawalAmountArg = algosdk.encodeUint64(ijarahInfo.principal);

      const txn = algosdk.makeApplicationCallTxnFromObject({
        from: activeAddress,
        appIndex: CONTRACT_CONFIG.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        appArgs: [method.getSelector(), withdrawalAmountArg],
        boxes: [
          { appIndex: CONTRACT_CONFIG.appId, name: boxName }
        ],
        suggestedParams: {
          ...suggestedParams,
          fee: 2000,
          flatFee: true,
        },
      });

      const signedTxn = await transactionSigner([txn], [0]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();

      console.log('📤 Withdrawal transaction sent:', txId);

      await algosdk.waitForConfirmation(algodClient, txId, 4);

      console.log('✅ Withdrawal successful!');

      showNotification('Withdrawal successful! Funds returned to your wallet.', 'success');
      await fetchAccountData();

    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      showNotification(error?.message || 'Failed to withdraw', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
  };

  const durations = [
    { days: '30', label: '30 Days', apy: '3.0%' },
    { days: '90', label: '90 Days', apy: '3.5%' },
    { days: '180', label: '180 Days', apy: '4.0%' },
    { days: '365', label: '1 Year', apy: '5.0%' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Notification Toast */}
        {notification.show && (
          <div className={`fixed top-6 right-6 ${notification.type === 'success' ? 'bg-emerald-500/90' : 'bg-red-500/90'} backdrop-blur border ${notification.type === 'success' ? 'border-emerald-400' : 'border-red-400'} rounded-xl p-4 shadow-xl flex items-center gap-3 z-50`}>
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-emerald-400">Sharia-Compliant</span> Staking
          </h1>
          <p className="text-gray-400">
            Earn halal rewards through Islamic leasing (Ijarah) on Algorand
          </p>

          {/* Wallet Connection Status */}
          {activeAddress ? (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-gray-400">Connected:</span>
              <span className="text-emerald-400 font-mono">
                {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
              </span>
            </div>
          ) : (
            <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 text-sm">Please connect your wallet to start staking</span>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Available</span>
            </div>
            <p className="text-3xl font-bold">
              {isLoadingData ? '...' : walletBalance.toFixed(2)}
            </p>
            <p className="text-gray-400 text-sm mt-1">ALGO</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Lock className="w-6 h-6 text-emerald-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Staked</span>
            </div>
            <p className="text-3xl font-bold">
              {isLoadingData ? '...' : stakedBalance.toFixed(2)}
            </p>
            <p className="text-gray-400 text-sm mt-1">ALGO</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-xl hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-6 h-6 text-emerald-400" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">Rewards</span>
            </div>
            <p className="text-3xl font-bold">
              {isLoadingData ? '...' : totalRewards.toFixed(4)}
            </p>
            <p className="text-gray-400 text-sm mt-1">ALGO Earned</p>
            {totalRewards > 0 && (
              <button
                onClick={handleClaimRewards}
                disabled={isProcessing}
                className="mt-3 w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm py-2 rounded-lg transition-all disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Claim Rewards'}
              </button>
            )}
          </div>
        </div>

        {/* Main Staking Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staking Form */}
          <div className="lg:col-span-2 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-8">
            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('stake')}
                className={`pb-4 px-2 font-medium transition-all ${
                  activeTab === 'stake'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Stake ALGO
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`pb-4 px-2 font-medium transition-all ${
                  activeTab === 'manage'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Manage Stake
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`pb-4 px-2 font-medium transition-all ${
                  activeTab === 'info'
                    ? 'text-emerald-400 border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                How It Works
              </button>
            </div>

            {activeTab === 'stake' ? (
              <>
                {/* Amount Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Amount to Stake
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={!activeAddress}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-4 text-2xl font-bold text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="text-gray-400 font-medium">ALGO</span>
                      <button
                        onClick={() => setStakeAmount(Math.max(0, walletBalance - 1).toString())}
                        disabled={!activeAddress}
                        className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Available: {walletBalance.toFixed(2)} ALGO (Minimum: 1 ALGO)
                  </p>
                </div>

                {/* Duration Selection */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Estimated Duration (for calculation only)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {durations.map((option) => (
                      <button
                        key={option.days}
                        onClick={() => setDuration(option.days)}
                        disabled={!activeAddress}
                        className={`p-4 rounded-lg border transition-all disabled:opacity-50 ${
                          duration === option.days
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-slate-800/50 border-slate-700 text-gray-400 hover:border-emerald-500/50'
                        }`}
                      >
                        <p className="font-bold text-lg">{option.label}</p>
                        <p className="text-xs mt-1">{option.apy} APY</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estimated Rewards */}
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Estimated Rewards</span>
                    <Info className="w-4 h-4 text-gray-500" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">
                    {estimatedRewards.toFixed(4)} ALGO
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Based on {annualRate}% annual rate for {duration} days
                  </p>
                </div>

                {/* Stake Button */}
                <button
                  onClick={handleStake}
                  disabled={!activeAddress || !stakeAmount || parseFloat(stakeAmount) < 1 || isProcessing}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Stake ALGO</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </>
            ) : activeTab === 'manage' ? (
              /* Manage Stake Tab */
              <div className="space-y-6">
                {ijarahInfo && stakedBalance > 0 ? (
                  <>
                    <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                      <h3 className="font-bold text-lg mb-4">Your Active Lease</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Principal Staked</span>
                          <span className="font-bold">{stakedBalance.toFixed(2)} ALGO</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Unclaimed Rewards</span>
                          <span className="font-bold text-emerald-400">{totalRewards.toFixed(4)} ALGO</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Start Date</span>
                          <span className="font-bold">
                            {new Date(ijarahInfo.startTime * 1000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={handleClaimRewards}
                        disabled={isProcessing || totalRewards <= 0}
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : 'Claim Rewards'}
                      </button>
                      <button
                        onClick={handleWithdraw}
                        disabled={isProcessing}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing...' : 'Withdraw All'}
                      </button>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
                      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-400 mb-1">Note</p>
                        <p className="text-sm text-gray-400">
                          Withdrawing will terminate your lease and return all funds plus unclaimed rewards.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">No Active Stake</h3>
                    <p className="text-gray-400 mb-6">
                      Start staking to earn halal rewards
                    </p>
                    <button
                      onClick={() => setActiveTab('stake')}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-6 py-3 rounded-lg transition-all"
                    >
                      Stake Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* How It Works Tab */
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Choose Amount</h3>
                    <p className="text-gray-400 text-sm">
                      Select how much ALGO you want to stake. Minimum is 1 ALGO.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Sharia-Compliant Process</h3>
                    <p className="text-gray-400 text-sm">
                      Your stake enters an Ijarah (Islamic leasing) contract. This is halal and follows Islamic finance principles.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Earn Ujrah (Rewards)</h3>
                    <p className="text-gray-400 text-sm">
                      Receive continuous rewards (Ujrah) based on your staked amount. All earnings are transparent and recorded on-chain.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Claim & Withdraw</h3>
                    <p className="text-gray-400 text-sm">
                      Claim your rewards anytime or withdraw your principal plus all accumulated rewards.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-400 mb-1">Sharia Compliance</p>
                    <p className="text-sm text-gray-400">
                      All transactions are verified to comply with Islamic finance principles, ensuring your earnings are halal.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    Contract Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">App ID:</span>
                      <span className="font-mono text-emerald-400">{CONTRACT_CONFIG.appId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Contract Address:</span>
                      <span className="font-mono text-xs text-emerald-400">
                        {CONTRACT_CONFIG.appAddress.slice(0, 8)}...{CONTRACT_CONFIG.appAddress.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            {/* Sharia Compliance Badge */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <h3 className="font-bold text-lg">Sharia Certified</h3>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                100% compliant with Islamic finance principles
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>No interest (Riba)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Asset-backed returns</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Transparent contracts</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">Staking Stats</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Annual Rate</span>
                    <span className="text-emerald-400 font-bold">{annualRate}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Min. Stake</span>
                    <span className="font-bold">1 ALGO</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Lock Period</span>
                    <span className="font-bold">Flexible</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Network</span>
                    <span className="font-bold">Algorand TestNet</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold">Need Help?</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                New to Islamic staking? Check our guide to get started.
              </p>
              <a
                href="https://developer.algorand.org/docs/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
              >
                <span>View Documentation</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Transaction History Link */}
            {activeAddress && (
              <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
                <h3 className="font-bold mb-4">Your Activity</h3>
                <a
                  href={`https://testnet.algoexplorer.io/address/${activeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 py-2 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
                >
                  <span>View on Explorer</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingPage

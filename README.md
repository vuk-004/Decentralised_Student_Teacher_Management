# Blockchain-Based Student Details Ledger System

## Project Description

The blockchain-based student details ledger system leverages Ethereum smart contracts to create a secure and decentralized platform for managing student records, including attendance and marks. By utilizing blockchain technology, the system ensures that all data is immutable and transparent, allowing for real-time updates and access.



##  Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Blockchain**: Ethereum
- **Smart Contracts**: Solidity
- **Development Framework**: Truffle
- **Wallet Integration**: MetaMask

## Prerequisites

Before running this project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14.0.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Truffle Framework](https://trufflesuite.com/truffle/)
- [Ganache](https://trufflesuite.com/ganache/) (for local blockchain)
- [MetaMask](https://metamask.io/) browser extension

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Truffle Globally (if not already installed)

```bash
npm install -g truffle
```

### 4. Start Ganache

Launch Ganache CLI or Ganache GUI to run a local blockchain:



##  Running the Project

### 1. Compile Smart Contracts

```bash
truffle compile
```

### 2. Deploy Smart Contracts

```bash
truffle migrate --network development
```


### 3. Start the Frontend Application

open with live server 

### 5. Configure MetaMask

1. Open MetaMask in your browser
2. Connect to your local Ganache network:
   - Network Name: Ganache Local
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337 (or your Ganache chain ID)
   - Currency Symbol: ETH
3. Import an account from Ganache using its private key




### Testnet Deployment (Optional)
For deploying to testnets like Ropsten , update your `truffle-config.js` with appropriate network configurations.



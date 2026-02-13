echo "Build contracts"
forge build

echo "Extract ABIs"
cd ../scripts && npm run extract-abis
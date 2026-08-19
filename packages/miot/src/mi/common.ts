export function updateMiAccount(account: any) {
  return (newAccount: any) => {
    for (const key in newAccount) {
      account[key] = newAccount[key];
    }
  };
}

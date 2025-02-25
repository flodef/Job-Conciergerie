export const generateUniqueId = async (): Promise<string> => {
  try {
    // Generate new ECDSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true,
      ['sign', 'verify'],
    );

    // Export public key as hex string
    const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
    const hashArray = new Uint8Array(hashBuffer);
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  } catch (error) {
    console.error('Error generating unique ID:', error);
    return '';
  }
};

const NEW_ID_CHAR = '$';

export async function generateUniqueId(): Promise<string> {
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
}

export const generateSimpleId = () =>
  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const formatId = (id: string) =>
  id.length <= 8
    ? id.replace(NEW_ID_CHAR, '')
    : `${id.replace(NEW_ID_CHAR, '').substring(0, 4)}...${id.substring(id.length - 4)}`;

export const isNewDevice = (id: string) => id.startsWith(NEW_ID_CHAR);
export const getNewDevice = (id: string) => NEW_ID_CHAR + id;

export const containsId = (ids: string[], id: string) =>
  ids.some(i => i.replace(NEW_ID_CHAR, '') === id.replace(NEW_ID_CHAR, ''));

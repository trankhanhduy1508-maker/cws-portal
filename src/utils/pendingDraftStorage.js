const DB_NAME = 'cws-render-drafts';
const STORE_NAME = 'pending-upload';
const DRAFT_ID = 'current';

function openDraftDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không khả dụng'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được IndexedDB'));
  });
}

export async function savePendingUploadFile(file) {
  const db = await openDraftDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, DRAFT_ID);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Không lưu được file draft'));
  });
  db.close();
}

export async function loadPendingUploadFile() {
  const db = await openDraftDb();
  const file = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(DRAFT_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Không đọc được file draft'));
  });
  db.close();
  return file;
}

export async function clearPendingUploadFile() {
  const db = await openDraftDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(DRAFT_ID);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Không xóa được file draft'));
  });
  db.close();
}

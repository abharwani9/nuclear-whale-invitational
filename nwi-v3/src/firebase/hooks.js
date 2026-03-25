// src/firebase/hooks.js
import { useState, useEffect } from "react";
import { db } from "./config";
import {
  collection, onSnapshot, doc, updateDoc, addDoc,
  deleteDoc, setDoc, query, orderBy
} from "firebase/firestore";

// Generic real-time collection hook
export function useCollection(collectionName, orderField = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = orderField
      ? query(collection(db, collectionName), orderBy(orderField))
      : collection(db, collectionName);

    const unsub = onSnapshot(ref, snap => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [collectionName, orderField]);

  return { data, loading };
}

// Single document hook
export function useDocument(collectionName, docId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, collectionName, docId), snap => {
      setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [collectionName, docId]);

  return { data, loading };
}

// CRUD helpers
export const firestore = {
  add: (col, data) => addDoc(collection(db, col), data),
  update: (col, id, data) => updateDoc(doc(db, col, id), data),
  delete: (col, id) => deleteDoc(doc(db, col, id)),
  set: (col, id, data) => setDoc(doc(db, col, id), data),
};

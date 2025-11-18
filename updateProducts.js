import { createRequire } from "module";
const require = createRequire(import.meta.url);

// O restante do código permanece igual, mas agora adaptado para rodar como Módulo
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixDatabaseFields() {
  console.log("🔍 Verificando banco de dados...");

  const productsRef = db.collection("products");
  const snapshot = await productsRef.get();

  if (snapshot.empty) {
    console.log("Nenhum produto encontrado.");
    return;
  }

  const batch = db.batch();
  let count = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    const updates = {};
    let needsUpdate = false;

    // Se não tiver o campo variants, cria vazio
    if (!data.variants) {
      updates.variants = [];
      needsUpdate = true;
    }

    // Se não tiver o campo isVariable, cria como false
    if (typeof data.isVariable === "undefined") {
      updates.isVariable = false;
      needsUpdate = true;
    }

    // Limpeza de campos antigos (se existirem)
    if (data.variations) {
      updates.variations = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    }
    if (typeof data.isUnique !== "undefined") {
      updates.isUnique = admin.firestore.FieldValue.delete();
      needsUpdate = true;
    }

    if (needsUpdate) {
      batch.update(doc.ref, updates);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Sucesso! ${count} produtos verificados e padronizados.`);
  } else {
    console.log("👍 Tudo certo! Nenhum ajuste necessário.");
  }
}

fixDatabaseFields().catch(console.error);

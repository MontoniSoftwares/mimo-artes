import {
  KeyRound,
  Layers,
  Loader,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY;
const SENHA_ADMIN = import.meta.env.VITE_SENHA_ADMIN;

const NUMERO_LOJA = "22988682317";
const LOGO_LOJA = "/mirian1.jpeg";
const LOGO_RODAPE = "/logo-ms.png";

let app, auth, db;
try {
  if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error("Aguardando configuração do .env...", e);
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [products, setProducts] = useState([]);

  // Estados de visualização
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [selectedProductForVariants, setSelectedProductForVariants] =
    useState(null);

  // Auth do Cliente
  const [clientName, setClientName] = useState("");
  const [clientWhats, setClientWhats] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Auth Admin
  const [isAdminLogged, setIsAdminLogged] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // --- ESTADOS DO FORMULÁRIO DE PRODUTO ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [productType, setProductType] = useState("simple"); // 'simple' ou 'variable'

  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");

  // Imagem Principal (apenas para produto simples)
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // --- ESTADOS PARA VARIAÇÕES ---
  const [variants, setVariants] = useState([]);
  // Form temporário da variação
  const [varDesc, setVarDesc] = useState(""); // ex: Azul Tam P
  const [varFile, setVarFile] = useState(null);
  const [varPreview, setVarPreview] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch((error) => {
      console.error("Erro no login anônimo:", error);
    });
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  if (!firebaseConfig.apiKey && !SENHA_ADMIN) {
    return <div className="p-10 text-center">Configure o .env</div>;
  }

  const handleNavigation = (targetView) => {
    if (view === "admin" && targetView !== "admin") setIsAdminLogged(false);
    setView(targetView);
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    let fmt = raw;
    if (raw.length > 10)
      fmt = `(${raw.slice(0, 2)}) ${raw.slice(2, 3)} ${raw.slice(
        3,
        7
      )}-${raw.slice(7)}`;
    else if (raw.length > 2) fmt = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    setClientWhats(fmt);
  };

  const handleClientEnter = async (e) => {
    e.preventDefault();
    const rawPhone = clientWhats.replace(/\D/g, "");
    if (!clientName || rawPhone.length < 10) return alert("Dados inválidos!");
    setIsLoggingIn(true);
    try {
      const q = query(
        collection(db, "leads"),
        where("whatsapp", "==", rawPhone)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "leads"), {
          name: clientName,
          whatsapp: rawPhone,
          whatsappFormatted: clientWhats,
          date: new Date().toISOString(),
        });
      }
      handleNavigation("catalog");
    } catch (error) {
      console.error(error);
      handleNavigation("catalog");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === SENHA_ADMIN) {
      setIsAdminLogged(true);
      setPasswordInput("");
    } else {
      alert("Senha incorreta.");
    }
  };

  const uploadImageToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await res.json();
      return data.success ? data.data.url : null;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  // --- GERENCIAMENTO DE VARIAÇÕES (ADMIN) ---
  const handleAddVariant = () => {
    if (!varDesc || !varPreview)
      return alert("Preencha a descrição e escolha uma foto para a variação.");

    const newVariant = {
      id: Date.now(), // ID temporário
      description: varDesc,
      file: varFile, // Guardamos o arquivo para upload final
      preview: varPreview, // Para mostrar na tela
      image: varPreview, // Se já for URL (edição), usa isso
    };

    setVariants([...variants, newVariant]);
    setVarDesc("");
    setVarFile(null);
    setVarPreview("");
  };

  const removeVariant = (id) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleVarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVarFile(file);
      setVarPreview(URL.createObjectURL(file));
    }
  };

  const handleMainFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setNewProdTitle(prod.title);
    setNewProdPrice(prod.price);
    setNewProdDesc(prod.description);

    if (prod.variants && prod.variants.length > 0) {
      setProductType("variable");
      setVariants(
        prod.variants.map((v) => ({
          ...v,
          preview: v.image, // Usa a URL existente
          file: null, // Sem arquivo novo por padrão
        }))
      );
      setPreviewUrl(""); // Limpa imagem principal
    } else {
      setProductType("simple");
      setPreviewUrl(prod.image);
      setVariants([]);
    }
  };

  const resetForm = () => {
    setNewProdTitle("");
    setNewProdPrice("");
    setNewProdDesc("");
    setImageFile(null);
    setPreviewUrl("");
    setEditingProduct(null);
    setVariants([]);
    setVarDesc("");
    setVarPreview("");
    setProductType("simple");
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newProdTitle || !newProdPrice) return alert("Preencha nome e preço!");

    if (productType === "variable" && variants.length === 0) {
      return alert(
        "Adicione pelo menos uma variação para este tipo de produto."
      );
    }

    setIsUploading(true);

    try {
      let finalData = {
        title: newProdTitle,
        price: newProdPrice,
        description: newProdDesc,
        updatedAt: new Date().toISOString(),
        isVariable: productType === "variable",
      };

      // Lógica para Produto Simples
      if (productType === "simple") {
        let imageUrl = previewUrl;
        if (imageFile) {
          const uploaded = await uploadImageToImgBB(imageFile);
          if (uploaded) imageUrl = uploaded;
        }
        finalData.image = imageUrl;
        finalData.variants = []; // Garante que não tem variantes
      }
      // Lógica para Produto com Variações
      else {
        // Upload de cada imagem de variação que seja nova (tenha 'file')
        const processedVariants = await Promise.all(
          variants.map(async (v) => {
            let vImageUrl = v.image || v.preview;
            if (v.file) {
              const uploaded = await uploadImageToImgBB(v.file);
              if (uploaded) vImageUrl = uploaded;
            }
            return {
              id: v.id,
              description: v.description,
              image: vImageUrl,
            };
          })
        );

        finalData.variants = processedVariants;
        // Define a imagem principal como a imagem da primeira variação para exibir na vitrine
        finalData.image = processedVariants[0]?.image || "";
      }

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), finalData);
        setToast("Atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "products"), {
          ...finalData,
          createdAt: new Date().toISOString(),
        });
        setToast("Criado com sucesso!");
      }

      resetForm();
      setTimeout(() => setToast(""), 2000);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Tem certeza?"))
      await deleteDoc(doc(db, "products", id));
  };

  return (
    <div className="min-h-screen bg-pink-50 font-sans text-gray-800 flex flex-col">
      {toast && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-pink-600 text-white font-bold px-6 py-2 rounded-xl shadow-lg z-100">
          {toast}
        </div>
      )}

      {/* HEADER */}
      {view !== "landing" && (
        <header className="bg-pink-600 text-white p-3 shadow-lg sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => handleNavigation("landing")}
            >
              <img
                src={LOGO_LOJA}
                className="w-10 h-10 rounded-full bg-white object-contain"
              />
              <div>
                <h1 className="font-bold text-lg leading-none">Mimo Artes</h1>
                <span className="text-[10px] text-pink-100 uppercase">
                  Fazendo Artes
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                handleNavigation(view === "catalog" ? "admin" : "catalog")
              }
              className="bg-white text-pink-600 px-3 py-1.5 rounded-full text-xs font-bold"
            >
              {view === "catalog" ? "Admin" : "Ver Loja"}
            </button>
          </div>
        </header>
      )}

      <main className="grow">
        {/* LANDING PAGE */}
        {view === "landing" && (
          <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-b from-pink-100 to-pink-200 px-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-4 border-pink-300">
              <img
                src={LOGO_LOJA}
                className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-white shadow-lg bg-white object-contain"
              />
              <h1 className="text-4xl font-bold text-pink-600 mb-1 font-serif">
                Mimo Artes
              </h1>
              <p className="text-gray-500 italic mb-8">
                "Fazendo Artes com amor"
              </p>
              <form onSubmit={handleClientEnter} className="space-y-4">
                <input
                  type="text"
                  className="w-full p-3 rounded-xl border-2 border-pink-100 outline-none"
                  placeholder="Seu Nome"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
                <input
                  type="tel"
                  className="w-full p-3 rounded-xl border-2 border-pink-100 outline-none"
                  placeholder="WhatsApp"
                  value={clientWhats}
                  onChange={handlePhoneChange}
                  required
                />
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex justify-center items-center gap-2"
                >
                  {isLoggingIn ? (
                    <Loader className="animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag size={20} /> ACESSAR CATÁLOGO
                    </>
                  )}
                </button>
              </form>
              <button
                onClick={() => handleNavigation("admin")}
                className="text-xs text-gray-400 mt-6 flex mx-auto gap-1"
              >
                <Lock size={12} /> Área Admin
              </button>
            </div>
          </div>
        )}

        {/* CATALOGO */}
        {view === "catalog" && (
          <div className="max-w-5xl mx-auto p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Nossas Peças</h2>
              <p className="text-gray-500">
                Olá,{" "}
                <span className="text-pink-600 font-bold">
                  {clientName || "Visitante"}
                </span>
                !
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl shadow-md overflow-hidden border border-pink-50 hover:shadow-xl transition-all flex flex-col"
                >
                  <div
                    className="h-64 bg-gray-100 overflow-hidden relative group cursor-pointer"
                    onClick={() => setFullscreenImage(prod.image)}
                  >
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {prod.isVariable && (
                      <div className="absolute bottom-2 right-2 bg-white/90 text-pink-600 px-3 py-1 rounded-full text-xs font-bold shadow flex items-center gap-1">
                        <Layers size={14} /> {prod.variants.length} Opções
                      </div>
                    )}
                    {!prod.isVariable && (
                      <div className="absolute bottom-2 right-2 bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                        Peça Única
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col grow">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{prod.title}</h3>
                      <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2 py-1 rounded h-fit">
                        R$ {prod.price}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 grow">
                      {prod.description}
                    </p>

                    {prod.isVariable ? (
                      <button
                        onClick={() => setSelectedProductForVariants(prod)}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-xl font-bold flex justify-center gap-2 transition"
                      >
                        <Layers size={18} /> Ver Opções e Cores
                      </button>
                    ) : (
                      <a
                        href={`https://wa.me/55${NUMERO_LOJA}?text=Olá! Me chamo ${clientName} e quero encomendar a Peça Única: ${prod.title} (R$ ${prod.price})`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-bold flex justify-center gap-2 transition"
                      >
                        <MessageCircle size={18} /> Encomendar
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN */}
        {view === "admin" && (
          <div className="max-w-4xl mx-auto p-6">
            {!isAdminLogged ? (
              <div className="max-w-sm mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border-2 border-pink-100 text-center">
                <KeyRound size={32} className="text-pink-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Área Restrita
                </h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input
                    type="password"
                    className="w-full p-3 border-2 border-pink-100 rounded-xl text-center"
                    placeholder="Senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full bg-pink-600 text-white font-bold py-3 rounded-xl"
                  >
                    Entrar
                  </button>
                </form>
                <button
                  onClick={() => handleNavigation("landing")}
                  className="text-xs text-gray-400 mt-4"
                >
                  Voltar
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-pink-500">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                      <Plus className="bg-pink-100 text-pink-600 rounded-full p-1" />{" "}
                      {editingProduct ? "Editar Produto" : "Novo Produto"}
                    </h2>
                    <div className="flex gap-2">
                      {editingProduct && (
                        <button
                          onClick={resetForm}
                          className="text-xs bg-gray-200 px-3 py-1 rounded-full"
                        >
                          Cancelar Edição
                        </button>
                      )}
                      <button
                        onClick={() => setIsAdminLogged(false)}
                        className="text-xs text-red-400 border border-red-100 px-3 py-1 rounded-full flex items-center gap-1"
                      >
                        <LogOut size={12} /> Sair
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSaveProduct}
                    className="grid grid-cols-1 gap-4"
                  >
                    {/* TIPO DE PRODUTO */}
                    <div className="flex gap-4 bg-gray-50 p-3 rounded-xl justify-center">
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition ${
                          productType === "simple"
                            ? "bg-pink-600 text-white"
                            : "bg-white text-gray-600 border"
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value="simple"
                          checked={productType === "simple"}
                          onChange={() => setProductType("simple")}
                          className="hidden"
                        />
                        Peça Única
                      </label>
                      <label
                        className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition ${
                          productType === "variable"
                            ? "bg-purple-600 text-white"
                            : "bg-white text-gray-600 border"
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value="variable"
                          checked={productType === "variable"}
                          onChange={() => setProductType("variable")}
                          className="hidden"
                        />
                        Com Variações
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        className="p-3 border rounded-lg w-full"
                        placeholder="Nome do Produto (Ex: Bolsinha Luxo)"
                        value={newProdTitle}
                        onChange={(e) => setNewProdTitle(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        className="p-3 border rounded-lg w-full"
                        placeholder="Preço Geral (R$)"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        required
                      />
                    </div>
                    <textarea
                      className="p-3 border rounded-lg w-full h-20"
                      placeholder="Descrição geral do produto..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                    ></textarea>

                    {/* MODO PEÇA ÚNICA */}
                    {productType === "simple" && (
                      <div className="border-2 border-dashed border-pink-200 rounded-xl p-4 text-center relative bg-pink-50/50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {previewUrl ? (
                          <div className="relative h-48 w-full">
                            <img
                              src={previewUrl}
                              className="h-full w-full object-contain mx-auto rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-2">
                              Clique para trocar a foto única
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-8 text-gray-400">
                            <Upload size={48} className="mb-2 text-pink-300" />
                            <p>Foto da Peça Única</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* MODO VARIAÇÕES */}
                    {productType === "variable" && (
                      <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
                        <h4 className="font-bold text-purple-800 mb-3 text-sm flex items-center gap-2">
                          <Layers size={16} /> Adicionar Variações
                          (Cores/Modelos)
                        </h4>

                        {/* Form de Add Variação */}
                        <div className="flex flex-col md:flex-row gap-3 mb-4 items-start">
                          <div className="relative w-20 h-20 shrink-0 bg-white border rounded-lg flex items-center justify-center overflow-hidden cursor-pointer hover:border-purple-400">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleVarFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            {varPreview ? (
                              <img
                                src={varPreview}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Plus className="text-gray-300" />
                            )}
                          </div>
                          <input
                            type="text"
                            className="grow p-2 border rounded-lg text-sm h-10"
                            placeholder="Detalhe (Ex: Vermelha - Tam P)"
                            value={varDesc}
                            onChange={(e) => setVarDesc(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={handleAddVariant}
                            className="bg-purple-600 text-white px-4 h-10 rounded-lg text-sm font-bold hover:bg-purple-700"
                          >
                            Adicionar
                          </button>
                        </div>

                        {/* Lista de Variações */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {variants.length === 0 && (
                            <p className="text-xs text-gray-400 italic text-center">
                              Nenhuma variação adicionada ainda.
                            </p>
                          )}
                          {variants.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm"
                            >
                              <img
                                src={v.preview}
                                className="w-10 h-10 rounded object-cover bg-gray-100"
                              />
                              <span className="text-sm font-medium text-gray-700 grow">
                                {v.description}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeVariant(v.id)}
                                className="text-red-400 hover:text-red-600 p-1"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isUploading}
                      className={`w-full text-white font-bold py-3 rounded-lg shadow-md mt-2 ${
                        isUploading
                          ? "bg-gray-400"
                          : "bg-pink-600 hover:bg-pink-700"
                      }`}
                    >
                      {isUploading ? "Enviando..." : "Salvar Produto Completo"}
                    </button>
                  </form>
                </div>

                {/* LISTAGEM ADMIN SIMPLES */}
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-600">
                    Produtos Cadastrados
                  </h3>
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={prod.image}
                          className="w-12 h-12 rounded-lg bg-gray-100 object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">
                            {prod.title}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {prod.isVariable
                              ? `${prod.variants.length} Variações`
                              : "Peça Única"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditProduct(prod)}
                          className="text-blue-400 hover:bg-blue-50 p-2 rounded-lg"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod.id)}
                          className="text-red-400 hover:bg-red-50 p-2 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE VARIAÇÕES PARA O CLIENTE */}
      {selectedProductForVariants && (
        <div
          className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedProductForVariants(null)}
        >
          <div
            className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-pink-50">
              <div>
                <h3 className="font-bold text-xl text-gray-800">
                  {selectedProductForVariants.title}
                </h3>
                <p className="text-sm text-pink-600 font-medium">
                  Escolha seu modelo favorito
                </p>
              </div>
              <button
                onClick={() => setSelectedProductForVariants(null)}
                className="bg-white p-2 rounded-full shadow text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 bg-gray-50">
              <div className="bg-white p-4 rounded-xl shadow-sm mb-2">
                <p className="text-gray-600 text-sm">
                  {selectedProductForVariants.description}
                </p>
                <p className="mt-2 font-bold text-lg text-pink-600">
                  R$ {selectedProductForVariants.price}
                </p>
              </div>

              <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider ml-1">
                Modelos Disponíveis:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                {selectedProductForVariants.variants?.map((v, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col"
                  >
                    <div
                      className="h-48 bg-gray-100 cursor-pointer"
                      onClick={() => setFullscreenImage(v.image)}
                    >
                      <img
                        src={v.image}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 flex flex-col grow">
                      <p className="font-bold text-gray-800 mb-3">
                        {v.description}
                      </p>
                      <a
                        href={`https://wa.me/55${NUMERO_LOJA}?text=Olá! Me chamo ${clientName} e apaixonei nessa variação do produto ${selectedProductForVariants.title}: ${v.description} (Preço Base: R$ ${selectedProductForVariants.price})`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-auto w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600"
                      >
                        <MessageCircle size={16} /> Quero este
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMAGEM FULLSCREEN */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-80 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 bg-black/20 p-2 rounded-full hover:text-white">
            <X size={32} />
          </button>
          <img
            src={fullscreenImage}
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <footer className="bg-pink-800 text-pink-100 py-6 px-4 mt-auto border-t-4 border-pink-600">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white p-1 rounded-lg shadow-lg shrink-0">
              <img
                src={LOGO_RODAPE}
                alt="Logo Montoni"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">
                Montoni Tech Soluções
              </p>
              <p className="text-pink-300 text-[10px] uppercase font-semibold tracking-wider">
                Inova Simples (IS)
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1 text-xs opacity-80">
            <p className="font-mono bg-pink-900/30 px-2 py-0.5 rounded text-[10px]">
              CNPJ: 62.553.238/0001-00
            </p>
            <p>© 2025 Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

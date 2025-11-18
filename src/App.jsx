import {
  KeyRound,
  Loader,
  Lock,
  LogOut,
  Maximize2,
  MessageCircle,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

// Importando Firebase
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
  where,
} from "firebase/firestore";

// --- 1. CONFIGURAÇÃO (ATENÇÃO AQUI) ---
// ⚠️ MODO HÍBRIDO:
// As chaves estão expostas AQUI apenas para a pré-visualização funcionar.
// NO SEU COMPUTADOR: Descomente as linhas 'import.meta.env' e apague as strings diretas.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

// Chave do ImgBB
// const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY; <--- USE ESTA NO VS CODE
const IMGBB_KEY = "c84a5731b24f82f3da759d1f73e1c3f1";

// Constantes da Loja
const SENHA_ADMIN = "mimo123";
const NUMERO_LOJA = "22988682317";
const LOGO_LOJA = "/mirian1.jpeg";
const LOGO_RODAPE = "/logo-ms.png";

// Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [products, setProducts] = useState([]);

  // Estado para Tela Cheia (Zoom)
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Estados do Cliente
  const [clientName, setClientName] = useState("");
  const [clientWhats, setClientWhats] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados do Admin
  const [isAdminLogged, setIsAdminLogged] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // Estados do Formulário de Produto
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  // --- EFEITOS ---
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("Erro no login anônimo:", error);
    });
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- FUNÇÕES ---

  const handleNavigation = (targetView) => {
    if (view === "admin" && targetView !== "admin") {
      setIsAdminLogged(false);
    }
    setView(targetView);
  };

  const handlePhoneChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const value = rawValue.slice(0, 11);

    let formatted = value;
    if (value.length > 10) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(
        3,
        7
      )}-${value.slice(7)}`;
    } else if (value.length > 6) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(
        3
      )}`;
    } else if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }
    setClientWhats(formatted);
  };

  const handleClientEnter = async (e) => {
    e.preventDefault();
    const rawPhone = clientWhats.replace(/\D/g, "");

    if (!clientName || rawPhone.length < 10) {
      return alert("Por favor, preencha seu nome e um WhatsApp válido!");
    }

    setIsLoggingIn(true);

    try {
      const q = query(
        collection(db, "leads"),
        where("whatsapp", "==", rawPhone)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingData = querySnapshot.docs[0].data();
        alert(
          `Que bom te ver de novo, ${
            existingData.name || clientName
          }! Acesso liberado.`
        );
      } else {
        await addDoc(collection(db, "leads"), {
          name: clientName,
          whatsapp: rawPhone,
          whatsappFormatted: clientWhats,
          date: new Date().toISOString(),
        });
        alert("Cadastro realizado com sucesso! Bem-vindo(a).");
      }

      handleNavigation("catalog");
    } catch (error) {
      console.error("Erro ao verificar login:", error);
      alert("Houve um erro ao conectar, mas vamos liberar seu acesso!");
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
      alert("Senha incorreta! Tente novamente.");
      setPasswordInput("");
    }
  };

  const uploadImageToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    // Verifica se a chave existe (seja via .env ou hardcoded)
    if (!IMGBB_KEY) {
      alert("ERRO CRÍTICO: Chave do ImgBB não encontrada!");
      return null;
    }

    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      return data.success ? data.data.url : null;
    } catch (error) {
      console.error("Erro upload:", error);
      return null;
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProdTitle || !newProdPrice || !imageFile)
      return alert("Preencha tudo!");
    setIsUploading(true);
    const imageUrl = await uploadImageToImgBB(imageFile);
    if (imageUrl) {
      await addDoc(collection(db, "products"), {
        title: newProdTitle,
        price: newProdPrice,
        description: newProdDesc,
        image: imageUrl,
        createdAt: new Date().toISOString(),
      });
      setNewProdTitle("");
      setNewProdPrice("");
      setNewProdDesc("");
      setImageFile(null);
      setPreviewUrl("");
      alert("Produto cadastrado!");
    }
    setIsUploading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("Excluir?")) await deleteDoc(doc(db, "products", id));
  };

  // --- VISUAL ---
  return (
    <div className="min-h-screen bg-pink-50 font-sans text-gray-800 flex flex-col">
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
                alt="Logo"
                className="w-10 h-10 rounded-full bg-white object-contain"
              />
              <div>
                <h1 className="font-bold text-lg leading-none">Mimo Artes</h1>
                <span className="text-[10px] text-pink-100 uppercase">
                  Fazendo Artes
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  handleNavigation(view === "catalog" ? "admin" : "catalog")
                }
                className="bg-white text-pink-600 px-3 py-1.5 rounded-full text-xs font-bold"
              >
                {view === "catalog" ? "Admin" : "Ver Loja"}
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow">
        {/* LANDING PAGE */}
        {view === "landing" && (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-pink-100 to-pink-200 px-4">
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
                  placeholder="(00) 9 0000-0000"
                  value={clientWhats}
                  onChange={handlePhoneChange}
                  maxLength={16}
                  required
                />

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex justify-center items-center gap-2 ${
                    isLoggingIn
                      ? "bg-pink-400"
                      : "bg-pink-500 hover:bg-pink-600"
                  }`}
                >
                  {isLoggingIn ? (
                    <>
                      {" "}
                      <Loader className="animate-spin" size={20} />{" "}
                      Verificando...{" "}
                    </>
                  ) : (
                    <>
                      {" "}
                      <ShoppingBag size={20} /> ACESSAR CATÁLOGO{" "}
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

        {/* CATÁLOGO */}
        {view === "catalog" && (
          <div className="max-w-5xl mx-auto p-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800">Nossas Peças</h2>
              <p className="text-gray-500">
                Bem-vindo(a),{" "}
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
                  className="bg-white rounded-2xl shadow-md overflow-hidden border border-pink-50 hover:shadow-xl transition-all"
                >
                  {/* IMAGEM CLICÁVEL COM EFEITO HOVER */}
                  <div
                    className="h-64 bg-gray-100 overflow-hidden relative group cursor-pointer"
                    onClick={() => setFullscreenImage(prod.image)}
                    title="Clique para ver em tela cheia"
                  >
                    <img
                      src={prod.image}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src =
                          "https://placehold.co/400x300/pink/white?text=Sem+Imagem";
                      }}
                    />
                    {/* Overlay com Texto */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm shadow-lg border border-white/30">
                        <Maximize2 size={16} /> Ver em tela cheia
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-gray-800">{prod.title}</h3>
                      <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2 py-1 rounded">
                        R$ {prod.price}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      {prod.description}
                    </p>
                    <a
                      href={`https://wa.me/55${NUMERO_LOJA}?text=Olá! Me chamo ${clientName} e quero encomendar: ${prod.title}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-green-500 hover:bg-green-600 text-white text-center py-2 rounded-xl font-bold flex justify-center gap-2 transition"
                    >
                      <MessageCircle size={18} /> Encomendar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA ADMIN */}
        {view === "admin" && (
          <div className="max-w-4xl mx-auto p-6">
            {!isAdminLogged ? (
              <div className="max-w-sm mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border-2 border-pink-100 text-center">
                <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <KeyRound size={32} className="text-pink-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Área Restrita
                </h2>
                <p className="text-gray-500 mb-6 text-sm">
                  Digite a senha para gerenciar a loja.
                </p>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input
                    type="password"
                    className="w-full p-3 border-2 border-pink-100 rounded-xl outline-none focus:border-pink-400 text-center tracking-widest"
                    placeholder="Senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-xl transition shadow-md"
                  >
                    Entrar no Painel
                  </button>
                </form>
                <button
                  onClick={() => handleNavigation("landing")}
                  className="text-xs text-gray-400 mt-4 hover:text-pink-500"
                >
                  Voltar para o início
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-l-4 border-pink-500">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                      <Plus className="bg-pink-100 text-pink-600 rounded-full p-1" />{" "}
                      Novo Produto
                    </h2>
                    <button
                      onClick={() => setIsAdminLogged(false)}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 border border-red-100 px-3 py-1 rounded-full"
                    >
                      <LogOut size={12} /> Sair
                    </button>
                  </div>
                  <form
                    onSubmit={handleAddProduct}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <input
                      type="text"
                      className="p-3 border rounded-lg outline-none focus:border-pink-400"
                      placeholder="Nome da Peça"
                      value={newProdTitle}
                      onChange={(e) => setNewProdTitle(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      className="p-3 border rounded-lg outline-none focus:border-pink-400"
                      placeholder="Preço (R$)"
                      value={newProdPrice}
                      onChange={(e) => setNewProdPrice(e.target.value)}
                      required
                    />
                    <div className="col-span-2 border-2 border-dashed border-pink-200 rounded-xl p-4 text-center hover:bg-pink-50 transition cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      {previewUrl ? (
                        <div className="relative h-48 w-full">
                          <img
                            src={previewUrl}
                            className="h-full w-full object-contain mx-auto rounded-lg"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Trocar foto
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center py-8 text-gray-400">
                          <Upload size={48} className="mb-2 text-pink-300" />
                          <p>Enviar foto</p>
                        </div>
                      )}
                    </div>
                    <textarea
                      className="col-span-2 p-3 border rounded-lg outline-none focus:border-pink-400 h-24"
                      placeholder="Descrição..."
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                    ></textarea>
                    <div className="col-span-2">
                      <button
                        type="submit"
                        disabled={isUploading}
                        className={`w-full text-white font-bold py-3 rounded-lg shadow-md flex justify-center gap-2 ${
                          isUploading
                            ? "bg-gray-400"
                            : "bg-pink-600 hover:bg-pink-700"
                        }`}
                      >
                        {isUploading ? (
                          <>
                            <Loader className="animate-spin" /> Enviando...
                          </>
                        ) : (
                          "Salvar Produto"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-4">
                  Lista de Produtos
                </h3>
                <div className="space-y-3">
                  {products.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={prod.image}
                          className="w-16 h-16 rounded-lg bg-gray-100 object-cover"
                        />
                        <div>
                          <h4 className="font-bold text-gray-800">
                            {prod.title}
                          </h4>
                          <p className="text-sm text-gray-500">
                            R$ {prod.price}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="text-red-400 hover:bg-red-50 p-2 rounded-lg"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* MODAL TELA CHEIA (LIGHTBOX) */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-6 right-6 text-white/70 hover:text-white transition bg-black/20 p-2 rounded-full">
            <X size={32} />
          </button>
          <img
            src={fullscreenImage}
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border-4 border-white/10 object-contain"
            onClick={(e) => e.stopPropagation()} // Clicar na imagem não fecha
          />
        </div>
      )}

      <footer className="bg-pink-800 text-pink-100 py-6 px-4 mt-auto border-t-4 border-pink-600">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white p-1 rounded-lg shadow-lg flex-shrink-0">
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

import {
  KeyRound, // Ícone novo para senha
  Loader,
  Lock,
  MessageCircle,
  Plus,
  ShoppingBag,
  Trash2,
  Upload,
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
  getFirestore,
  onSnapshot,
} from "firebase/firestore";

// --- 1. CONFIGURAÇÃO ---
const firebaseConfig = {
  apiKey: "AIzaSyBKTv8fGLe3v6Kkp--jPQwqMh3fPgeYxBI",
  authDomain: "loja-mimo-artes.firebaseapp.com",
  projectId: "loja-mimo-artes",
  storageBucket: "loja-mimo-artes.firebasestorage.app",
  messagingSenderId: "116269374400",
  appId: "1:116269374400:web:fb19325e734672533fc625",
};

const IMGBB_KEY = "c84a5731b24f82f3da759d1f73e1c3f1";

// 🔐 SUA SENHA MESTRA (Mude aqui se quiser)
const SENHA_ADMIN = "mimo123";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const LOGO_LOJA = "/mirian1.jpeg";
const LOGO_RODAPE = "/logo-ms.png";

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("landing");
  const [products, setProducts] = useState([]);

  // Estados do Cliente
  const [clientName, setClientName] = useState("");
  const [clientWhats, setClientWhats] = useState("");

  // Estados do Admin
  const [isAdminLogged, setIsAdminLogged] = useState(false); // Já digitou a senha?
  const [passwordInput, setPasswordInput] = useState(""); // O que está digitando

  // Estados do Formulário de Produto
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  // --- EFEITOS ---
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
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

  // ✨ FUNÇÃO DE MÁSCARA CORRIGIDA
  const handlePhoneChange = (e) => {
    // 1. Pega apenas os números do que foi digitado
    const rawValue = e.target.value.replace(/\D/g, "");

    // 2. Limita a 11 dígitos
    const value = rawValue.slice(0, 11);

    let formatted = value;

    // 3. Monta a máscara do zero baseado na quantidade de números
    if (value.length > 10) {
      // Formato completo: (22) 9 9999-9999
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(
        3,
        7
      )}-${value.slice(7)}`;
    } else if (value.length > 6) {
      // Formato parcial: (22) 9 9999...
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 3)} ${value.slice(
        3
      )}`;
    } else if (value.length > 2) {
      // Formato inicial: (22) 9...
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    }

    // Se tiver menos de 2 dígitos, mostra só os números mesmo (ex: "2" ou "22")

    setClientWhats(formatted);
  };

  const handleClientEnter = async (e) => {
    e.preventDefault();
    const rawPhone = clientWhats.replace(/\D/g, "");
    if (!clientName || rawPhone.length < 10)
      return alert("Preencha nome e WhatsApp!");

    await addDoc(collection(db, "leads"), {
      name: clientName,
      whatsapp: rawPhone,
      whatsappFormatted: clientWhats,
      date: new Date().toISOString(),
    });
    setView("catalog");
  };

  // FUNÇÃO NOVA: Verificar Senha
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === SENHA_ADMIN) {
      setIsAdminLogged(true);
      setPasswordInput(""); // Limpa o campo por segurança
    } else {
      alert("Senha incorreta! Tente novamente.");
      setPasswordInput("");
    }
  };

  const uploadImageToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    if (!IMGBB_KEY) return null;
    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,
        { method: "POST", body: formData }
      );
      const data = await response.json();
      return data.success ? data.data.url : null;
    } catch {
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
              onClick={() => setView("landing")}
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
                  setView(view === "catalog" ? "admin" : "catalog")
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
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex justify-center gap-2"
                >
                  <ShoppingBag size={20} /> ACESSAR CATÁLOGO
                </button>
              </form>
              <button
                onClick={() => setView("admin")}
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
                  <div className="h-64 bg-gray-100 overflow-hidden">
                    <img
                      src={prod.image}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
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
                      href={`https://wa.me/55${clientWhats.replace(
                        /\D/g,
                        ""
                      )}?text=Olá! Quero encomendar: ${prod.title}`}
                      target="_blank"
                      className="block bg-green-500 text-white text-center py-2 rounded-xl font-bold flex justify-center gap-2"
                    >
                      <MessageCircle size={18} /> Encomendar
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA ADMIN (COM PROTEÇÃO DE SENHA) */}
        {view === "admin" && (
          <div className="max-w-4xl mx-auto p-6">
            {/* TELA DE LOGIN DA DONA */}
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
                  onClick={() => setView("landing")}
                  className="text-xs text-gray-400 mt-4 hover:text-pink-500"
                >
                  Voltar para o início
                </button>
              </div>
            ) : (
              // SE JÁ LOGOU, MOSTRA O PAINEL
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

      <footer className="bg-pink-800 text-pink-100 py-8 px-4 mt-auto text-center text-sm border-t-4 border-pink-600">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-16 h-16 bg-white p-1.5 rounded-xl shadow-lg">
            <img src={LOGO_RODAPE} className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="font-bold text-white text-lg">
              Montoni Tech Soluções
            </p>
            <p className="text-pink-300 text-xs uppercase font-semibold">
              Inova Simples (IS)
            </p>
          </div>
        </div>
        <p className="font-mono bg-pink-900/30 inline-block px-2 py-0.5 rounded text-xs">
          CNPJ: 62.553.238/0001-00
        </p>
        <p className="text-xs mt-2">
          © 2025 Montoni Tech Soluções. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

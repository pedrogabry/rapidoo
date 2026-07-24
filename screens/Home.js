import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ref, get, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import { useGlobalContext } from "../context/GlobalContext";

const categories = [
  { id: "1", name: "Hambúrguer", icon: "🍔" },
  { id: "2", name: "Pizza", icon: "🍕" },
  { id: "3", name: "Japonesa", icon: "🍣" },
  { id: "4", name: "Açaí", icon: "🥤" },
  { id: "5", name: "Mercado", icon: "🛒" },
];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [listaRestaurantes, setlistaRestaurantes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const navigation = useNavigation();
  const { userId, enderecos } = useGlobalContext();

  // Pegar o endereço principal do usuário
  const enderecoAtual =
    enderecos && enderecos.length > 0 ? enderecos[0] : null;

  function getEnderecoTexto() {
    if (!enderecoAtual) return "📍 Cadastrar Endereço";
    const ruaNum = `${enderecoAtual.rua || ""}, ${enderecoAtual.numero || ""}`;
    const bairro = enderecoAtual.bairro ? ` - ${enderecoAtual.bairro}` : "";
    const texto = `📍 ${ruaNum}${bairro}`;
    return texto.length > 32 ? texto.slice(0, 30) + "..." : texto;
  }

  async function loadRestaurants() {
    try {
      const snapshot = await get(ref(database, "restaurants"));
      const data = [];
      snapshot.forEach((child) => {
        data.push({
          id: child.key,
          ...child.val(),
        });
      });
      setRestaurants(data);
      setFiltered(data);

      const restaurante = await get(ref(database, "restaurantes"));
      if (restaurante.exists()) {
        const lista = Object.entries(restaurante.val()).map(
          ([id, dados]) => ({
            id,
            nome: dados.name,
            logo: dados.logo,
          })
        );
        setlistaRestaurantes(lista);
      }
    } catch (error) {
      console.log("Erro ao buscar restaurantes:", error);
    }
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  // Escutar pedidos do usuário em tempo real
  useEffect(() => {
    const pedidosRef = ref(database, "pedidos");
    const unsubscribe = onValue(
      pedidosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const activeList = Object.entries(data)
            .map(([id, p]) => ({ id, ...p }))
            .filter((p) => {
              const isUserMatch = userId ? p.userId === userId : true;
              const status = (p.status || "").toLowerCase();
              const isActive =
                status !== "entregue" &&
                status !== "concluido" &&
                status !== "cancelado";
              return isUserMatch && isActive;
            })
            .sort(
              (a, b) =>
                new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0)
            );

          setActiveOrder(activeList.length > 0 ? activeList[0] : null);
          setActiveOrdersCount(activeList.length);
        } else {
          setActiveOrder(null);
          setActiveOrdersCount(0);
        }
      },
      (error) => {
        console.error("Erro ao escutar pedidos ativos na Home:", error);
      }
    );
    return () => unsubscribe();
  }, [userId]);

  function handleSearch(text) {
    setSearch(text);
    if (text.trim() === "") {
      setFiltered(restaurants);
      return;
    }
    const result = restaurants.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase())
    );
    setFiltered(result);
  }

  function handleCategory(category) {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setFiltered(restaurants);
      return;
    }
    setSelectedCategory(category);
    const result = restaurants.filter((item) => item.category === category);
    setFiltered(result);
  }

  function getStatusText(statusKey) {
    const st = (statusKey || "realizado").toLowerCase();
    if (st === "preparacao" || st === "preparando") return "Em preparação 👨‍🍳";
    if (st === "entrega" || st === "a caminho") return "Saiu para entrega 🛵";
    if (st === "entregue") return "Entregue 🎉";
    return "Pedido Confirmado 📝";
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Perfil")}
          activeOpacity={0.7}
        >
          <Text style={styles.location}>{getEnderecoTexto()}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profile}
          onPress={() => navigation.navigate("Perfil")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 18 }}>👤</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        placeholder="Buscar restaurantes ou comidas..."
        style={styles.search}
        value={search}
        onChangeText={handleSearch}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* CARD DE PEDIDO EM ANDAMENTO */}
        {activeOrder && (
          <TouchableOpacity
            style={styles.activeOrderCard}
            activeOpacity={0.88}
            onPress={() =>
              navigation.navigate("AcompanhamentoPedido", {
                pedidoId: activeOrder.id,
              })
            }
          >
            <View style={styles.activeOrderContent}>
              <View style={styles.activeOrderIconBox}>
                <Text style={styles.activeOrderIcon}>🛵</Text>
              </View>
              <View style={styles.activeOrderTextContainer}>
                <View style={styles.activeOrderHeaderRow}>
                  <Text style={styles.activeOrderTitle}>
                    {activeOrdersCount > 1
                      ? `${activeOrdersCount} pedidos em andamento`
                      : "Pedido em andamento"}
                  </Text>
                  <Text style={styles.activeOrderBadge}>30-45 min</Text>
                </View>
                <Text style={styles.activeOrderSub}>
                  {getStatusText(activeOrder.status)}
                </Text>
                <Text style={styles.activeOrderLink}>
                  Acompanhar entrega ›
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* CATEGORIAS */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleCategory(item.name)}
              style={[
                styles.category,
                selectedCategory === item.name && styles.categorySelected,
              ]}
            >
              <Text
                style={[
                  selectedCategory === item.name && styles.categoryTextSelected,
                ]}
              >
                {item.icon} {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Entrega rápida 🚀</Text>
          <Text style={styles.bannerText}>
            Os melhores restaurantes perto de você
          </Text>
        </View>

        <Text style={styles.title}>Restaurantes perto de você</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image
                source={{
                  uri: item.image,
                }}
                style={styles.image}
              />
              <Text style={styles.restaurant}>{item.name}</Text>
              <Text style={styles.info}>⭐ {item.rating}</Text>
              <Text style={styles.info}>⏱ {item.time}</Text>
              <Text style={styles.price}>R$ {item.price}</Text>
            </View>
          )}
        />

        <Text style={styles.texto_restaurantes_titulo}>Restaurantes</Text>
        {listaRestaurantes.map((item) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Restaurantes", {
                id: item.id,
              })
            }
            style={styles.listarestaurantes}
            key={item.id}
          >
            <Image
              source={{ uri: item.logo }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "blue",
              }}
            />
            <Text style={styles.textorestaurantes}>{item.nome}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  location: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  profile: {
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 50,
  },
  search: {
    backgroundColor: "#f2f2f2",
    padding: 15,
    borderRadius: 12,
    marginVertical: 15,
  },
  activeOrderCard: {
    backgroundColor: "#EFE8FD",
    borderColor: "#6B3FE4",
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#6B3FE4",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  activeOrderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeOrderIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6B3FE4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeOrderIcon: {
    fontSize: 22,
  },
  activeOrderTextContainer: {
    flex: 1,
  },
  activeOrderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeOrderTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#222",
  },
  activeOrderBadge: {
    backgroundColor: "#6B3FE4",
    color: "#FFF",
    fontSize: 11,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeOrderSub: {
    fontSize: 13,
    color: "#6B3FE4",
    fontWeight: "600",
    marginTop: 2,
  },
  activeOrderLink: {
    fontSize: 12,
    color: "#555",
    fontWeight: "bold",
    marginTop: 4,
  },
  category: {
    backgroundColor: "#eee",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  categorySelected: {
    backgroundColor: "#6b3fe4",
  },
  categoryTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  banner: {
    backgroundColor: "#6b3fe4",
    padding: 20,
    borderRadius: 15,
    marginVertical: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  bannerText: {
    color: "#fff",
    marginTop: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  card: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 15,
    marginRight: 15,
    paddingBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  image: {
    width: 160,
    height: 110,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  restaurant: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 8,
  },
  info: {
    paddingHorizontal: 8,
    fontSize: 13,
    color: "#555",
  },
  price: {
    paddingHorizontal: 8,
    marginTop: 5,
    fontWeight: "bold",
    fontSize: 15,
  },
  listarestaurantes: {
    backgroundColor: "#e7e3e33b",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
    borderRadius: 10,
  },
  texto_restaurantes_titulo: {
    margin: 20,
    fontSize: 18,
    fontWeight: "bold",
  },
  textorestaurantes: {
    marginLeft: 20,
    fontSize: 15,
    fontWeight: "bold",
  },
});

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ref, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import { useGlobalContext } from "../context/GlobalContext";

const STAGES = [
  { key: "realizado", label: "Pedido Confirmado", sub: "O restaurante recebeu seu pedido", icon: "📝" },
  { key: "preparacao", label: "Em Preparação", sub: "A cozinha está preparando seu prato", icon: "👨‍🍳" },
  { key: "entrega", label: "Saiu para Entrega", sub: "O entregador está a caminho de você", icon: "🛵" },
  { key: "entregue", label: "Pedido Entregue", sub: "Aproveite a sua refeição!", icon: "🎉" },
];

export default function AcompanhamentoPedido() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = useGlobalContext();
  const { pedidoId } = route.params || {};

  const [pedidosAtivos, setPedidosAtivos] = useState([]);
  const [selectedPedidoId, setSelectedPedidoId] = useState(pedidoId || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pedidosRef = ref(database, "pedidos");
    const unsubscribe = onValue(
      pedidosRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const lista = Object.entries(data)
            .map(([id, p]) => ({ id, ...p }))
            .filter((p) => {
              // Filtrar pedidos deste usuário (ou se houver pedidoId específico)
              const matchesUser = userId ? p.userId === userId : (pedidoId ? p.id === pedidoId : true);
              const status = (p.status || "").toLowerCase();
              const isEmAndamento =
                status !== "entregue" &&
                status !== "concluido" &&
                status !== "cancelado";
              return matchesUser && isEmAndamento;
            })
            .sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));

          setPedidosAtivos(lista);

          // Se tiver pedidoId passado e ele estiver na lista, selecionar ele. Senão selecionar o primeiro da lista.
          if (selectedPedidoId) {
            const aindaExiste = lista.find((p) => p.id === selectedPedidoId);
            if (!aindaExiste && lista.length > 0) {
              setSelectedPedidoId(lista[0].id);
            }
          } else if (lista.length > 0) {
            setSelectedPedidoId(lista[0].id);
          }
        } else {
          setPedidosAtivos([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar pedidos ativos:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, pedidoId]);

  function getStageIndex(statusKey) {
    const key = (statusKey || "realizado").toLowerCase();
    if (key === "pendente" || key === "realizado" || key === "confirmado") return 0;
    if (key === "preparacao" || key === "preparando") return 1;
    if (key === "entrega" || key === "a caminho") return 2;
    if (key === "entregue" || key === "concluido") return 3;
    return 0;
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B3FE4" />
        <Text style={styles.loadingText}>Carregando pedidos em andamento...</Text>
      </SafeAreaView>
    );
  }

  if (pedidosAtivos.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.notFoundIcon}>📦</Text>
        <Text style={styles.notFoundTitle}>Nenhum pedido em andamento</Text>
        <Text style={styles.notFoundSub}>
          Você não possui pedidos sendo preparados ou entregues no momento.
        </Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeButtonText}>Voltar para o Início</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pedidoAtual =
    pedidosAtivos.find((p) => p.id === selectedPedidoId) || pedidosAtivos[0];
  const currentStageIndex = getStageIndex(pedidoAtual?.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Pedidos em Andamento</Text>
          <Text style={styles.headerSub}>
            {pedidosAtivos.length} {pedidosAtivos.length === 1 ? "pedido ativo" : "pedidos ativos"}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* SELETOR DE PEDIDOS SE HOUVER MAIS DE UM */}
      {pedidosAtivos.length > 1 && (
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {pedidosAtivos.map((p, index) => {
              const isSelected = p.id === pedidoAtual.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.tabItem, isSelected && styles.tabItemSelected]}
                  onPress={() => setSelectedPedidoId(p.id)}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                    🛵 Pedido #{p.id.slice(-5).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* CARD PREVISÃO DE ENTREGA */}
        <View style={styles.cardPrevisao}>
          <View style={styles.previsaoHeader}>
            <Text style={styles.previsaoLabel}>
              Pedido #{pedidoAtual.id ? pedidoAtual.id.slice(-6).toUpperCase() : ""}
            </Text>
            <Text style={styles.previsaoStatusBadge}>
              {STAGES[currentStageIndex].label}
            </Text>
          </View>
          <Text style={styles.previsaoTempo}>30 - 45 min</Text>
          <Text style={styles.previsaoSub}>
            {STAGES[currentStageIndex].sub}
          </Text>
          {/* BARRA DE PROGRESSO ILUSTRATIVA */}
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((currentStageIndex + 1) / STAGES.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* ENDEREÇO DE ENTREGA */}
        {pedidoAtual.endereco && (
          <View style={styles.cardEndereco}>
            <Text style={styles.cardTitle}>📍 Endereço de Entrega</Text>
            <Text style={styles.enderecoRua}>
              {pedidoAtual.endereco.rua}, {pedidoAtual.endereco.numero}
            </Text>
            {pedidoAtual.endereco.bairro ? (
              <Text style={styles.enderecoSub}>
                Bairro: {pedidoAtual.endereco.bairro}
                {pedidoAtual.endereco.cidade ? ` - ${pedidoAtual.endereco.cidade}` : ""}
              </Text>
            ) : null}
            {pedidoAtual.endereco.cep ? (
              <Text style={styles.enderecoSub}>CEP: {pedidoAtual.endereco.cep}</Text>
            ) : null}
            {pedidoAtual.endereco.complemento ? (
              <Text style={styles.enderecoSub}>Complemento: {pedidoAtual.endereco.complemento}</Text>
            ) : null}
            {pedidoAtual.endereco.coordenadas ? (
              <View style={styles.geoBadge}>
                <Text style={styles.geoBadgeText}>
                  📍 Localização GPS capturada ({pedidoAtual.endereco.coordenadas.latitude?.toFixed(4)}, {pedidoAtual.endereco.coordenadas.longitude?.toFixed(4)})
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* TIMELINE DE ESTÁGIOS */}
        <View style={styles.cardTimeline}>
          <Text style={styles.cardTitle}>Status do Pedido</Text>
          <View style={styles.timelineContainer}>
            {STAGES.map((stage, index) => {
              const isDone = index <= currentStageIndex;
              const isCurrent = index === currentStageIndex;
              return (
                <View key={stage.key} style={styles.timelineStep}>
                  <View style={styles.stepLeft}>
                    <View
                      style={[
                        styles.stepCircle,
                        isDone && styles.stepCircleDone,
                        isCurrent && styles.stepCircleCurrent,
                      ]}
                    >
                      <Text style={styles.stepIcon}>{stage.icon}</Text>
                    </View>
                    {index < STAGES.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          index < currentStageIndex && styles.stepLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text
                      style={[
                        styles.stepTitle,
                        isDone && styles.stepTitleDone,
                        isCurrent && styles.stepTitleCurrent,
                      ]}
                    >
                      {stage.label}
                    </Text>
                    <Text style={styles.stepSub}>{stage.sub}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* DETALHES DOS ITENS DO PEDIDO */}
        <View style={styles.cardItens}>
          <Text style={styles.cardTitle}>Resumo do Pedido</Text>
          {(pedidoAtual.itens || []).map((item, index) => (
            <View key={index} style={styles.itemRow}>
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, { backgroundColor: "#ECECEC" }]} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemNome}>
                  {item.quantidade}x {item.nome}
                </Text>
                {item.adicionais && item.adicionais.length > 0 && (
                  <Text style={styles.itemExtras}>
                    + {item.adicionais.map((a) => a.nome).join(", ")}
                  </Text>
                )}
                {item.removidos && item.removidos.length > 0 && (
                  <Text style={styles.itemRemovidos}>
                    Sem: {item.removidos.join(", ")}
                  </Text>
                )}
              </View>
              <Text style={styles.itemPreco}>
                R$ {((item.preco || 0) * (item.quantidade || 1))
                  .toFixed(2)
                  .replace(".", ",")}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pago</Text>
            <Text style={styles.totalValor}>
              R$ {(pedidoAtual.total || 0).toFixed(2).replace(".", ",")}
            </Text>
          </View>
        </View>

        {/* BOTOES DE AÇÃO */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => alert("Ajuda: Nosso suporte entrará em contato!")}
        >
          <Text style={styles.helpButtonText}>📞 Falar com o Restaurante</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeSecondaryButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeSecondaryButtonText}>Voltar para o Início</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FFF",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 16,
  },
  notFoundIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  notFoundSub: {
    marginTop: 6,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  headerSub: {
    fontSize: 12,
    color: "#888",
  },
  tabsContainer: {
    backgroundColor: "#FFF",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 10,
  },
  tabItemSelected: {
    backgroundColor: "#6B3FE4",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#666",
  },
  tabTextSelected: {
    color: "#FFF",
  },
  cardPrevisao: {
    backgroundColor: "#6B3FE4",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#6B3FE4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  previsaoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previsaoLabel: {
    color: "#E5D9F8",
    fontSize: 14,
    fontWeight: "600",
  },
  previsaoStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    color: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
  },
  previsaoTempo: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
    marginVertical: 8,
  },
  previsaoSub: {
    color: "#E5D9F8",
    fontSize: 14,
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 4,
  },
  cardEndereco: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  enderecoRua: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginTop: 6,
  },
  enderecoSub: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  geoBadge: {
    backgroundColor: "#EFE8FD",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  geoBadgeText: {
    fontSize: 12,
    color: "#6B3FE4",
    fontWeight: "600",
  },
  cardTimeline: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStep: {
    flexDirection: "row",
    marginBottom: 20,
  },
  stepLeft: {
    alignItems: "center",
    marginRight: 16,
    width: 36,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCircleDone: {
    backgroundColor: "#EFE8FD",
  },
  stepCircleCurrent: {
    backgroundColor: "#6B3FE4",
    borderWidth: 3,
    borderColor: "#E5D9F8",
  },
  stepIcon: {
    fontSize: 18,
  },
  stepLine: {
    width: 2,
    height: 30,
    backgroundColor: "#E0E0E0",
    marginTop: 4,
  },
  stepLineDone: {
    backgroundColor: "#6B3FE4",
  },
  stepContent: {
    flex: 1,
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888",
  },
  stepTitleDone: {
    color: "#333",
  },
  stepTitleCurrent: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 16,
  },
  stepSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  cardItens: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemNome: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  itemExtras: {
    fontSize: 12,
    color: "#6B3FE4",
    marginTop: 2,
  },
  itemRemovidos: {
    fontSize: 12,
    color: "#D9534F",
    marginTop: 2,
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#444",
  },
  divider: {
    height: 1,
    backgroundColor: "#ECECEC",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  totalValor: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6B3FE4",
  },
  helpButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#6B3FE4",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  helpButtonText: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 15,
  },
  homeSecondaryButton: {
    backgroundColor: "#EFE8FD",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  homeSecondaryButtonText: {
    color: "#6B3FE4",
    fontWeight: "bold",
    fontSize: 15,
  },
  homeButton: {
    backgroundColor: "#6B3FE4",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  homeButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },
});

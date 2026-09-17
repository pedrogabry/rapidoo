import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ref, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import { PAYMENT_CONFIG, ORDER_STATUS, ORDER_STATUS_LABELS } from "../paymentConfig";
import {
  criarPagamentoMercadoPago,
  simularAprovacaoPagamento,
  simularRecusaPagamento,
  atualizarStatusPedido,
} from "../services/paymentService";

export default function Pagamento() {
  const navigation = useNavigation();
  const route = useRoute();
  const { pedidoId } = route.params || {};

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metodoPagamento, setMetodoPagamento] = useState("pix"); // 'pix' | 'cartao'
  const [pixInfo, setPixInfo] = useState(null);
  const [gerandoPix, setGerandoPix] = useState(false);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  // Escutar atualizações do pedido em tempo real no Firebase Realtime Database
  useEffect(() => {
    if (!pedidoId) {
      setLoading(false);
      Alert.alert("Erro", "ID do pedido não encontrado.", [
        { text: "Voltar", onPress: () => navigation.navigate("Home") },
      ]);
      return;
    }

    const pedidoRef = ref(database, `pedidos/${pedidoId}`);
    const unsubscribe = onValue(
      pedidoRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const dados = snapshot.val();
          setPedido(dados);

          // Redirecionamento automático quando o pagamento for aprovado
          if (dados.status === ORDER_STATUS.PAGAMENTO_APROVADO) {
            Alert.alert(
              "🎉 Pagamento Aprovado!",
              "Seu pagamento foi confirmado com sucesso pelo Mercado Pago.",
              [
                {
                  text: "Acompanhar Pedido",
                  onPress: () =>
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "AcompanhamentoPedido", params: { pedidoId } }],
                    }),
                },
              ],
              { cancelable: false }
            );
          }
        } else {
          Alert.alert("Erro", "Pedido não encontrado no banco de dados.");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao escutar status do pedido:", error);
        setLoading(false);
        Alert.alert("Erro de Conexão", "Falha ao obter atualizações em tempo real do pedido.");
      }
    );

    return () => unsubscribe();
  }, [pedidoId]);

  // Criar ou obter cobrança no Mercado Pago
  useEffect(() => {
    if (pedido && !pixInfo && !gerandoPix) {
      gerarCobrancaMercadoPago();
    }
  }, [pedido]);

  async function gerarCobrancaMercadoPago() {
    if (!pedido) return;
    setGerandoPix(true);
    try {
      const res = await criarPagamentoMercadoPago(pedido);
      if (res && res.sucesso) {
        setPixInfo(res);
      }
    } catch (err) {
      console.error("Erro ao criar pagamento no Mercado Pago:", err);
      Alert.alert("Aviso", "Não foi possível conectar à API do Mercado Pago. Usando cobrança de contingência.");
    } finally {
      setGerandoPix(false);
    }
  }

  async function handleCopiarPix() {
    if (pixInfo?.qrCode) {
      Alert.alert("Código Pix", pixInfo.qrCode, [
        { text: "Copiar / Ok", onPress: () => {} },
      ]);
    } else {
      Alert.alert("Aviso", "Código Pix ainda não foi gerado.");
    }
  }

  async function handleSimularAprovacao() {
    if (!pedidoId) return;
    setProcessandoAcao(true);
    try {
      await simularAprovacaoPagamento(pedidoId, pedido?.usuarioId);
    } catch (error) {
      Alert.alert("Erro", "Falha ao simular aprovação do pagamento.");
    } finally {
      setProcessandoAcao(false);
    }
  }

  async function handleSimularRecusa() {
    if (!pedidoId) return;
    setProcessandoAcao(true);
    try {
      await simularRecusaPagamento(pedidoId, pedido?.usuarioId);
    } catch (error) {
      Alert.alert("Erro", "Falha ao simular recusa do pagamento.");
    } finally {
      setProcessandoAcao(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B3FE4" />
        <Text style={styles.loadingText}>Carregando informações de pagamento...</Text>
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Pedido não encontrado</Text>
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backHomeText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusAtual = pedido.status || ORDER_STATUS.AGUARDANDO_PAGAMENTO;
  const statusTexto = ORDER_STATUS_LABELS[statusAtual] || statusAtual;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() =>
            Alert.alert(
              "Sair do Pagamento?",
              "Seu pedido continuará aguardando pagamento.",
              [
                { text: "Continuar aqui", style: "cancel" },
                { text: "Sair", onPress: () => navigation.navigate("Home") },
              ]
            )
          }
        >
          <Text style={styles.headerBackText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pagamento Mercado Pago</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* RESUMO DO PEDIDO */}
        <View style={styles.card}>
          <View style={styles.badgeStatus}>
            <Text style={styles.badgeStatusText}>
              Status: {statusTexto}
            </Text>
          </View>

          <Text style={styles.pedidoIdText}>Pedido #{pedidoId}</Text>
          <Text style={styles.totalValorText}>
            R$ {(pedido.total || 0).toFixed(2).replace(".", ",")}
          </Text>

          <View style={styles.divider} />

          <View style={styles.subInfoRow}>
            <Text style={styles.subInfoLabel}>Subtotal:</Text>
            <Text style={styles.subInfoValue}>
              R$ {(pedido.subtotal || 0).toFixed(2).replace(".", ",")}
            </Text>
          </View>
          <View style={styles.subInfoRow}>
            <Text style={styles.subInfoLabel}>Taxa de entrega:</Text>
            <Text style={styles.subInfoValue}>
              R$ {(pedido.taxaEntrega || 0).toFixed(2).replace(".", ",")}
            </Text>
          </View>
          {pedido.desconto > 0 && (
            <View style={styles.subInfoRow}>
              <Text style={styles.subInfoLabel}>Desconto:</Text>
              <Text style={styles.subInfoValue}>
                - R$ {(pedido.desconto || 0).toFixed(2).replace(".", ",")}
              </Text>
            </View>
          )}
        </View>

        {/* METODOS DE PAGAMENTO */}
        <Text style={styles.sectionTitle}>Selecione a Forma de Pagamento</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              metodoPagamento === "pix" && styles.tabBtnActive,
            ]}
            onPress={() => setMetodoPagamento("pix")}
          >
            <Text
              style={[
                styles.tabBtnText,
                metodoPagamento === "pix" && styles.tabBtnTextActive,
              ]}
            >
              ⚡ Pix
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              metodoPagamento === "cartao" && styles.tabBtnActive,
            ]}
            onPress={() => setMetodoPagamento("cartao")}
          >
            <Text
              style={[
                styles.tabBtnText,
                metodoPagamento === "cartao" && styles.tabBtnTextActive,
              ]}
            >
              💳 Cartão
            </Text>
          </TouchableOpacity>
        </View>

        {/* ÁREA PIX */}
        {metodoPagamento === "pix" && (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Pagamento Instantâneo via Pix</Text>
            {gerandoPix ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#6B3FE4" size="small" />
                <Text style={styles.loadingBoxText}>Gerando código Pix...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.pixInstruction}>
                  Copie o código abaixo e utilize a opção "Pix Copia e Cola" no aplicativo do seu banco:
                </Text>

                <View style={styles.pixCodeContainer}>
                  <Text style={styles.pixCodeText} numberOfLines={3}>
                    {pixInfo?.qrCode || "Gerando Pix..."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopiarPix}
                >
                  <Text style={styles.copyButtonText}>📋 Copiar Código Pix</Text>
                </TouchableOpacity>

                <View style={styles.waitingContainer}>
                  <ActivityIndicator color="#6B3FE4" size="small" />
                  <Text style={styles.waitingText}>
                    Aguardando confirmação do pagamento...
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ÁREA CARTÃO */}
        {metodoPagamento === "cartao" && (
          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>Cartão de Crédito (Mercado Pago)</Text>
            <Text style={styles.pixInstruction}>
              Insira os dados do cartão de crédito para processar o pagamento com segurança:
            </Text>

            <View style={styles.cardSimulatedBox}>
              <Text style={styles.simulatedCardTitle}>💳 Checkout Transparente</Text>
              <Text style={styles.simulatedCardSub}>
                Integração com Mercado Pago SDK / Public Key: {PAYMENT_CONFIG.MERCADO_PAGO_PUBLIC_KEY.slice(0, 15)}...
              </Text>
            </View>

            <TouchableOpacity
              style={styles.payButton}
              onPress={handleSimularAprovacao}
              disabled={processandoAcao}
            >
              {processandoAcao ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.payButtonText}>Pagar R$ {(pedido.total || 0).toFixed(2).replace(".", ",")}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MODO SANDBOX / SIMULAÇÃO DE APÓS WEBHOOK */}
        {PAYMENT_CONFIG.IS_SANDBOX && (
          <View style={styles.sandboxCard}>
            <Text style={styles.sandboxTitle}>🛠️ Painel de Testes Mercado Pago Sandbox</Text>
            <Text style={styles.sandboxSub}>
              Para validar o fluxo instantâneo de callback/webhook no Firebase, selecione um resultado:
            </Text>

            <TouchableOpacity
              style={styles.btnAprovar}
              onPress={handleSimularAprovacao}
              disabled={processandoAcao}
            >
              <Text style={styles.btnAprovarText}>
                ✅ Simular Pagamento Aprovado
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnRecusar}
              onPress={handleSimularRecusa}
              disabled={processandoAcao}
            >
              <Text style={styles.btnRecusarText}>
                ❌ Simular Pagamento Recusado
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6FB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F6FB",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B3FE4",
    fontWeight: "600",
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  backHomeBtn: {
    backgroundColor: "#6B3FE4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backHomeText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  headerBackBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerBackText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  badgeStatus: {
    alignSelf: "flex-start",
    backgroundColor: "#EFE8FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeStatusText: {
    color: "#6B3FE4",
    fontSize: 13,
    fontWeight: "bold",
  },
  pedidoIdText: {
    fontSize: 14,
    color: "#777",
  },
  totalValorText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#222",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 14,
  },
  subInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  subInfoLabel: {
    fontSize: 14,
    color: "#666",
  },
  subInfoValue: {
    fontSize: 14,
    color: "#222",
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 12,
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: "#EFEFEF",
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    marginRight: 8,
  },
  tabBtnActive: {
    backgroundColor: "#6B3FE4",
  },
  tabBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
  },
  tabBtnTextActive: {
    color: "#FFF",
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 8,
  },
  pixInstruction: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  pixCodeContainer: {
    backgroundColor: "#F0F0F5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  pixCodeText: {
    fontSize: 12,
    color: "#444",
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: "#6B3FE4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  copyButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  waitingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  waitingText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#6B3FE4",
    fontWeight: "600",
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingBoxText: {
    marginTop: 8,
    color: "#666",
  },
  cardSimulatedBox: {
    backgroundColor: "#F7F5FF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5D9F8",
    marginBottom: 16,
  },
  simulatedCardTitle: {
    fontWeight: "bold",
    color: "#6B3FE4",
    fontSize: 14,
  },
  simulatedCardSub: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  payButton: {
    backgroundColor: "#28A745",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  sandboxCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFEEBA",
    marginTop: 10,
    marginBottom: 30,
  },
  sandboxTitle: {
    fontWeight: "bold",
    color: "#856404",
    fontSize: 14,
    marginBottom: 4,
  },
  sandboxSub: {
    fontSize: 12,
    color: "#856404",
    marginBottom: 12,
  },
  btnAprovar: {
    backgroundColor: "#28A745",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  btnAprovarText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  btnRecusar: {
    backgroundColor: "#DC3545",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnRecusarText: {
    color: "#FFF",
    fontWeight: "bold",
  },
});

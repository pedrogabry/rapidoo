const API_URL = "https://api.asaas.com/v3";

const ASAAS_API_KEY = "sua api key aqui"; // Substitua pela sua chave de API do Asaas


async function createCustomer({
  nome,
  email,
  cpfCnpj,
}) {

  const response = await fetch(
    `${API_URL}/customers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: nome || "Cliente Rapidoo",
        email,
        cpfCnpj,
      }),
    }
  );


  const data = await response.json();


  if(!response.ok){
    throw new Error(
      data.errors?.[0]?.description ||
      "Erro criando cliente"
    );
  }


  return data.id;
}



export async function createAsaasPayment({
  pedidoId,
  valor,
  email,
  descricao,
  nome,
  cpfCnpj,
}) {


  try {


    console.log("CRIANDO CLIENTE ASAAS");


    const customerId = await createCustomer({
      nome,
      email,
      cpfCnpj: cpfCnpj || "06855050140",
    });



    console.log(
      "CUSTOMER ASAAS",
      customerId
    );



    const response = await fetch(
      `${API_URL}/payments`,
      {
        method:"POST",

        headers:{
          "Content-Type":"application/json",
          "access_token":ASAAS_API_KEY,
        },


        body:JSON.stringify({

          customer: customerId,

          billingType:"UNDEFINED",

          value:Number(valor),

          dueDate:new Date()
          .toISOString()
          .split("T")[0],


          description:descricao,


          externalReference:pedidoId,


          notificationUrl:
          "https://rapidoo-vecel-7hvqc40yu-pedrogabrieloliveiramarques-projects.vercel.app/api/asaas-webhook"

        })
      }
    );



    const data = await response.json();


    console.log(
      "RESPOSTA ASAAS",
      data
    );


    if(!response.ok){
      throw new Error(
        data.errors?.[0]?.description ||
        "Erro criando cobrança"
      );
    }


    return data;


  } catch(error){

    console.log(
      "ERRO ASAAS",
      error
    );

    throw error;
  }

}
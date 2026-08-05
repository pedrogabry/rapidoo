import React,{useEffect,useState} from "react";

import {
 View,
 Text,
 StyleSheet,
 Linking,
 TouchableOpacity,
 ActivityIndicator,
 SafeAreaView
}
from "react-native";


import {useRoute} from "@react-navigation/native";


export default function CheckoutAsaas(){

const route=useRoute();

const {
paymentUrl
}=route.params || {};


const [loading,setLoading]=useState(true);



useEffect(()=>{


async function abrir(){

try{

await Linking.openURL(paymentUrl);


}
catch(e){

console.log(e);

}


finally{

setLoading(false);

}

}


if(paymentUrl)
abrir();


},[]);



return (

<SafeAreaView style={styles.container}>


{
loading ?

<ActivityIndicator
size="large"
/>


:

<>

<Text style={styles.title}>
Finalize seu pagamento
</Text>


<TouchableOpacity

style={styles.button}

onPress={()=>
Linking.openURL(paymentUrl)
}

>

<Text style={styles.buttonText}>
Abrir pagamento
</Text>


</TouchableOpacity>

</>

}



</SafeAreaView>

);


}



const styles=StyleSheet.create({

container:{
flex:1,
justifyContent:"center",
alignItems:"center"
},


title:{
fontSize:20,
fontWeight:"bold",
marginBottom:20
},


button:{
backgroundColor:"#6B3FE4",
padding:15,
borderRadius:10
},


buttonText:{
color:"#fff"
}


});
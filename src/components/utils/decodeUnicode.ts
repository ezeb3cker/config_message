/**
 * Decodifica strings com emojis no formato unicode e quebras de linha
 * Exemplos: 
 * - "\uD83D\uDE00" -> 😀
 * - "\\uD83D\\uDE00" -> 😀
 * - "\u{1F600}" -> 😀
 * - "\\n" -> quebra de linha real
 */
export function decodeUnicode(str: string): string {
  if (!str) return '';
  
  try {
    // Primeiro, tentar decodificar formato \uXXXX (com barra dupla escapada)
    let decoded = str.replace(/\\u([\dA-Fa-f]{4})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
    
    // Tentar decodificar formato \u{XXXXX} (com barra dupla escapada)
    decoded = decoded.replace(/\\u\{([\dA-Fa-f]+)\}/g, (match, hex) => {
      return String.fromCodePoint(parseInt(hex, 16));
    });
    
    // Converter quebras de linha literais \n em quebras de linha reais
    decoded = decoded.replace(/\\n/g, '\n');
    
    // Converter tabs literais \t em tabs reais
    decoded = decoded.replace(/\\t/g, '\t');
    
    // Converter retorno de carro literal \r em retorno de carro real
    decoded = decoded.replace(/\\r/g, '\r');
    
    return decoded;
  } catch (error) {
    console.warn('Erro ao decodificar unicode:', error);
    return str;
  }
}

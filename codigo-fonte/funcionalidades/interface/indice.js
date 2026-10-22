/**
 * Telas e formulários: autenticação, registros, participação e administração.
 * Barrel export — mantém a API pública inalterada.
 * Edite os arquivos em componentes/ para alterar cada módulo.
 */
export {
	renderHistory,
	renderClosure
} from "./componentes/historico.js";

export {
	mountAdministrativeAction,
	mountAdministration
} from "./componentes/administracao.js";

export {
	createImageFields,
	renderAttachments
} from "./componentes/anexos.js";

export {
	mountGoogleAuth
} from "./componentes/autenticacao-google.js";

export {
	mountAuth
} from "./componentes/autenticacao.js";

export {
	mountContributionForm,
	renderContributions
} from "./componentes/contribuicoes.js";

export {
	renderPublicLinks,
	mountLinkManagement
} from "./componentes/vinculos.js";

export {
	mountOccurrenceForm
} from "./componentes/formulario-ocorrencia.js";

export {
	mountHud
} from "./componentes/painel.js";

export {
	mountStanceForm,
	renderStances
} from "./componentes/manifestacoes.js";

export {
	mountTransitionForm
} from "./componentes/transicoes.js";
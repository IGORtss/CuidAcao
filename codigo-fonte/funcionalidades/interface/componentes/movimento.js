/** Movimento de apresentação. Não altera dados, câmera ou ordem de navegação. */
export const movimentoReduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const curvaOrganica = "cubic-bezier(.22,.85,.24,1)";
const animacoes = new WeakMap();
const emCurso = new Set();

export function animar(elemento, quadros, opcoes = {}) {
	if (!elemento || movimentoReduzido()) return null;
	const animacao = elemento.animate(quadros, { duration: 340, easing: curvaOrganica, ...opcoes });
	emCurso.add(animacao);
	animacao.finished.catch(() => {}).finally(() => emCurso.delete(animacao));
	return animacao;
}

// Uma nova navegação interrompe o percurso anterior na posição visual atual.
export function cancelarMovimento(elemento) {
	animacoes.get(elemento)?.cancel();
	animacoes.delete(elemento);
}

export function ajustarAltura(elemento, anterior) {
	if (!elemento || !anterior || movimentoReduzido()) return;
	cancelarMovimento(elemento);
	const altura = elemento.getBoundingClientRect().height;
	if (Math.abs(altura - anterior.height) < 2) return;
	const animacao = animar(elemento, [{ height: `${anterior.height}px` }, { height: `${altura}px` }], { duration: 330 });
	if (animacao) animacoes.set(elemento, animacao);
}

export function entrarElementos(elemento, direcao = 1) {
	if (!elemento || movimentoReduzido()) return;
	const filhos = [...elemento.children].filter(no => !no.hidden && !no.classList.contains("movimento-saida"));
	for (const [indice, filho] of filhos.slice(0, 14).entries()) {
		cancelarMovimento(filho);
		const animacao = animar(filho, [
			{ transform: `translate(${direcao * 20}px, 12px) scale(.975)`, opacity: 0 },
			{ transform: "translate(0, -1px) scale(1.003)", opacity: 1, offset: .8 },
			{ transform: "none", opacity: 1 }
		], { duration: 310, delay: Math.min(indice * 22, 132), fill: "backwards" });
		if (animacao) animacoes.set(filho, animacao);
	}
}

/** Liga uma superfície à sua origem sem redimensionar texto por escala. */
export function entrarSuperficie(elemento, origem, { direcao = 1 } = {}) {
	if (!elemento || movimentoReduzido()) return;
	const destino = elemento.getBoundingClientRect();
	const inicio = origem?.width ? origem : null;
	cancelarMovimento(elemento);
	const dx = inicio ? Math.max(-100, Math.min(100, inicio.left - destino.left)) : direcao * 28;
	const dy = inicio ? Math.max(-90, Math.min(90, inicio.top - destino.top)) : 22;
	const recorte = inicio ? Math.max(0, Math.min(65, (1 - inicio.height / destino.height) * 100)) : 8;
	const animacao = animar(elemento, [
		{ transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(0 0 ${recorte}% 0 round 32px)`, opacity: .7 },
		{ transform: "translate(0, -2px)", clipPath: "inset(0 round 28px)", opacity: 1, offset: .82 },
		{ transform: "none", clipPath: "inset(0 round 24px)", opacity: 1 }
	], { duration: 390 });
	if (animacao) animacoes.set(elemento, animacao);
}

/** Saída visual decorativa: sem IDs, foco, ações ou campos editáveis duplicados. */
export function guardarSaida(elemento, recipiente = elemento?.parentElement) {
	if (!elemento || !recipiente || movimentoReduzido() || !elemento.getClientRects().length) return null;
	const caixa = elemento.getBoundingClientRect(), base = recipiente.getBoundingClientRect();
	const copia = elemento.cloneNode(true);
	for (const no of [copia, ...copia.querySelectorAll("*")]) {
		no.removeAttribute("id");
		no.removeAttribute("autofocus");
		no.removeAttribute("name");
		if (no.matches("input[type=password]")) no.value = "";
	}
	copia.classList.add("movimento-saida");
	copia.inert = true;
	copia.setAttribute("aria-hidden", "true");
	copia.style.cssText += `;position:absolute!important;left:${caixa.left-base.left}px!important;top:${caixa.top-base.top}px!important;width:${caixa.width}px!important;height:${caixa.height}px!important;max-height:none!important;margin:0!important;pointer-events:none!important;overflow:hidden!important;z-index:4;`;
	recipiente.append(copia);
	return copia;
}

export function sairElementos(copia, direcao = -1) {
	if (!copia) return;
	const animacao = animar(copia, [
		{ transform: "none", opacity: 1 },
		{ transform: `translate(${direcao * 28}px, -6px) scale(.97)`, opacity: 0 }
	], { duration: 160, easing: "cubic-bezier(.4,0,.8,.3)" });
	if (animacao) animacao.finished.catch(() => {}).finally(() => copia.remove());
	else copia.remove();
}

if (typeof matchMedia === "function") matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", evento => {
	if (!evento.matches) return;
	for (const animacao of emCurso) animacao.cancel();
	document.querySelectorAll(".movimento-saida").forEach(no => no.remove());
});

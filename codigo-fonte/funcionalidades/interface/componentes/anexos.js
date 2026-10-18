/**
 * Imagens e anexos
 */
import { createAttachmentClient } from "../../../servicos/api.js";

const node = (tag, text = "") => {
	const element = document.createElement(tag);
	element.textContent = text;
	return element;
};

let imageFieldInstance = 0;
export function createImageFields({ parentLabel = "relato" } = {}) {
	const prefix = `evidence-${++imageFieldInstance}`;
	const section = node("section");
	section.className = "image-fields";
	section.setAttribute("aria-label", "Imagens opcionais");
	section.append(node("h3", "Imagens opcionais"), node("p", `Até cinco imagens fictícias JPEG, PNG ou WebP. Máximo de 5 MiB e 20 megapixels por arquivo. Legenda de 5 a 200 caracteres. O ${parentLabel} é salvo antes das imagens.`));
	const list = node("div"), add = node("button", "Adicionar imagem");
	add.type = "button";
	section.append(list, add);
	let rows = [], serial = 0, busy = false;
	function state() {
		add.disabled = busy || rows.length >= 5;
		for (const row of rows) {
			row.file.disabled = busy || row.done;
			row.caption.disabled = busy || row.done;
			row.remove.disabled = busy || row.done;
		}
	}
	function append() {
		if (rows.length >= 5) return;
		const wrapper = node("div");
		wrapper.className = "image-field";
		const number = ++serial;
		const file = node("input");
		file.type = "file";
		file.accept = "image/jpeg,image/png,image/webp";
		file.id = `${prefix}-file-${number}`;
		const fileLabel = node("label", `Imagem fictícia ${number}`);
		fileLabel.htmlFor = file.id;
		const caption = node("input");
		caption.type = "text";
		caption.maxLength = 200;
		caption.id = `${prefix}-caption-${number}`;
		const captionLabel = node("label", `Legenda da imagem ${number}`);
		captionLabel.htmlFor = caption.id;
		const status = node("p");
		status.setAttribute("role", "status");
		status.id = `${prefix}-status-${number}`;
		file.setAttribute("aria-describedby", status.id);
		caption.setAttribute("aria-describedby", status.id);
		const remove = node("button", "Remover da seleção");
		remove.type = "button";
		wrapper.append(fileLabel, file, captionLabel, caption, status, remove);
		list.append(wrapper);
		const row = {
			wrapper,
			file,
			caption,
			status,
			remove,
			done: false
		};
		file.addEventListener("change", () => {
			status.textContent = file.files[0] ? `Selecionada: ${file.files[0].name}` : "";
		});
		rows.push(row);
		remove.addEventListener("click", () => {
			if (busy) return;
			rows = rows.filter((value) => value !== row);
			wrapper.remove();
			state();
			add.focus();
		});
		state();
	}
	add.addEventListener("click", () => {
		append();
		rows.at(-1)?.file.focus();
	});
	return {
		element: section,
		reset() {
			rows = [];
			serial = 0;
			list.replaceChildren();
			busy = false;
			state();
		},
		setBusy(value) {
			busy = value;
			state();
		},
		pending() {
			return rows.filter((row) => !row.done && row.file.files.length > 0);
		},
		async send(client, item, contributionId) {
			for (const row of this.pending()) {
				row.status.textContent = "Enviando imagem…";
				try {
					const result = await client.upload(item.id, item.version, row.file.files[0], row.caption.value, contributionId);
					item.version = result.occurrenceVersion;
					row.done = true;
					row.status.textContent = "Imagem enviada.";
				} catch (error) {
					row.status.textContent = error.message;
					throw error;
				}
			}
			state();
		}
	};
}

export async function renderAttachments(container, item, { auth, signal, onChanged, images, occurrenceVersion, contribution, reportForm }) {
	const client = createAttachmentClient();
	container.replaceChildren(node("p", "Carregando imagens…"));
	try {
		const result = images ? {
			data: images,
			occurrenceVersion
		} : await client.list(item.id, { signal });
		if (signal?.aborted) return;
		container.replaceChildren();
		if (!result.data.length) container.append(node("p", "Nenhuma imagem anexada ao relato."));
		const message = node("p");
		message.setAttribute("role", "status");
		message.tabIndex = -1;
		container.append(message);
		for (const image of result.data) {
			if (!image.available) {
				container.append(node("p", "Imagem retirada ou indisponível."));
				continue;
			}
			const figure = node("figure"), img = node("img");
			img.alt = image.caption;
			img.loading = "lazy";
			img.src = `/api/v1/attachments/${encodeURIComponent(image.id)}/file`;
			img.width = image.width;
			img.height = image.height;
			const caption = node("figcaption", image.caption);
			figure.append(img, caption);
			reportForm?.appendReport(figure, {
				...item,
				version: result.occurrenceVersion
			}, "attachment", image.id);
			container.append(figure);
			img.addEventListener("error", () => {
				img.hidden = true;
				caption.textContent = "Imagem indisponível. Tente recarregar a ocorrência.";
			});
			if (auth.getUser()?.id === (contribution ?? item).authorId && !item.duplicateOfId && Date.now() - Date.parse((contribution ?? item).createdAt) <= 864e5 && (contribution ? contribution.type === "reopen_request" ? ["closed", "discarded"].includes(item.statusCode) && contribution.requestStatus === "pending" : [
				"community_review",
				"confirmed",
				"monitoring"
			].includes(item.statusCode) : item.statusCode === "received")) {
				const remove = node("button", "Retirar imagem");
				remove.type = "button";
				figure.append(remove);
				remove.addEventListener("click", async () => {
					remove.disabled = true;
					try {
						await client.withdraw(image.id, result.occurrenceVersion);
						onChanged();
					} catch (error) {
						message.textContent = error.message + (error.status === 409 ? " Recarregue os detalhes antes de tentar novamente." : "");
						message.focus();
						if (error.status === 401) auth.openLogin();
					} finally {
						remove.disabled = false;
					}
				});
			}
		}
	} catch (error) {
		if (signal?.aborted) return;
		container.replaceChildren(node("p", error.message));
		const retry = node("button", "Tentar consultar imagens novamente");
		retry.type = "button";
		retry.addEventListener("click", () => renderAttachments(container, item, {
			auth,
			signal,
			onChanged,
			images,
			occurrenceVersion,
			contribution,
			reportForm
		}));
		container.append(retry);
	}
}
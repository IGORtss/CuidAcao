import test from 'node:test';
import assert from 'node:assert/strict';
import {occurrences} from '../src/data/occurrences.js';
import {filterOccurrences,findOccurrence,selectedId,statuses,categories,formatDate} from '../src/domain.js';
test('fixtures explícitas e válidas',()=>{assert.equal(new Set(occurrences.map(x=>x.id)).size,occurrences.length);for(const item of occurrences){assert.equal(item.simulated,true);assert.ok(statuses.includes(item.status));assert.ok(categories.includes(item.category));assert.ok(item.latitude>=-90&&item.latitude<=90);assert.ok(item.longitude>=-180&&item.longitude<=180);assert.ok(item.description);assert.ok(item.history.length);}});
test('filtros combinam categoria e estado e permitem vazio',()=>{assert.equal(filterOccurrences(occurrences).length,4);assert.equal(filterOccurrences(occurrences,'Água').length,1);assert.equal(filterOccurrences(occurrences,'Resíduos','Encerrada')[0].id,'CA-004');assert.equal(filterOccurrences(occurrences,'Água','Encerrada').length,0);});
test('seleção inválida não aponta a outro registro',()=>{assert.equal(selectedId('#ocorrencia=CA-001'),'CA-001');assert.equal(selectedId('#ocorrencia=<script>'),null);assert.equal(findOccurrence(occurrences,'desconhecida'),null);assert.equal(formatDate('2026-10-01T12:00:00Z'),'01/10/2026');});

# GenImort

Protótipo web de um jogo 2.5D inspirado no ritmo de combate de action RPGs isométricos e nas mecânicas de exploração de mundo aberto.

## Conteúdo jogável

- mapa aberto ampliado, com câmera seguindo o herói por uma área muito maior;
- herói guerreiro e monstros desenhados em sprites de canvas mais detalhados;
- chão com relevo, caminhos, pedras, biomas e graminhas animadas;
- baús escondidos com raridade e respawn ao longo da exploração;
- recursos coletáveis representados por árvores, cristais e ervas animadas, também com respawn;
- loot físico de baús com janela de coleta clicável para ouro, poções e equipamentos;
- inventário visual em grade 4x5 no HUD e também dentro do menu principal;
- crafting simples combinando 5 itens iguais + ouro para subir o tier de poções e equipamentos;
- evolução com XP, níveis, mais objetivos e árvore de skills expandida;
- skill ativa de ataque em área, combate contínuo e ciclos de conteúdo para o jogo não acabar rápido.

## Estrutura de assets

Sprites e imagens futuras devem ser colocadas em:

- `assets/images/characters/hero/` para sprites do herói;
- `assets/images/items/` para itens de inventário, baús e crafting;
- `assets/images/resources/` para madeira, cristal, erva e outros coletáveis;
- `assets/images/enemies/` para monstros e variações;
- `assets/images/ui/` para molduras, ícones e elementos de interface.

## Como rodar

Abra o arquivo `index.html` no navegador.

Se preferir usar um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

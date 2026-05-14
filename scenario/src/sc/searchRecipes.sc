theme: /
    state: ПоискРецептов
        q!: (найди | покажи) рецепты (из | с) $AnyText::ingredients
        q!: (что приготовить | рецепт) из $AnyText::ingredients
        script:
            log('Запрос рецептов');
            var ings = $parseTree._ingredients.split(/[\s,и]+/).filter(function(w) { return w.length > 2; });
            searchRecipes(ings, $context);
        random:
            a: "Ищу подходящие рецепты"
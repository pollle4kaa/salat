theme: /
    state: ДобавитьПродукт
        q!: (добавь | съел | запиши | ем) 
            [$Amount::amount] 
            (грамм | г)
            $FoodName::foodName
            
        q!: (добавь | съел | запиши | ем) 
            $FoodName::foodName
            
        script:
            log('Добавление продукта: ' + $parseTree._foodName);
            var amount = $parseTree._amount || 100;
            addFood($parseTree._foodName, amount, $context);
            
            addSuggestions([
                "добавь 150г курицы",
                "сколько съел?",
                "что съесть?"
            ], $context);
            
        random:
            a: Добавил {{$parseTree._foodName}}
            a: Записал {{$parseTree._foodName}}
            a: Ок, {{$parseTree._foodName}} добавлен
Ux.plugin.HorizontalDataViewPaging
==================================

Sencha Touch 2  plugin that adds a Load More button at the end(right) of a DataView with horizontal scrollable
Inspired from Ext.plugin.ListPaging.

Usage
```javascript
Ext.create('Ext.DataView', {
    fullscreen: true,
    store: {
        fields: ['name', 'age'],
        data: [
            {name: 'Jamie',  age: 100},
            {name: 'Rob',   age: 21},
            {name: 'Tommy', age: 24},
            {name: 'Jacky', age: 24},
            {name: 'Ed',   age: 26}
        ]
    },
    scrollable: 'horizontal',
    inline: {
        wrap: false
    },
    plugins: [{
    	type: 'hdataviewpaging'
	}],
    itemTpl: '<div>{name} is {age} years old</div>'
});
```

Example on video: https://vimeo.com/63639531
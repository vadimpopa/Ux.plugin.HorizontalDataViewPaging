/**
 * @class Ux.plugin.HorizontalDataViewPaging
 * @extend Ext.Component
 *
 * A plugin inspired from Ext.plugin.ListPaging, that adds a Load More button at the end(right) of a dataview with horizontal scrollable
 * @author Vadim Popa
 * 
*/

Ext.define('Ux.plugin.HorizontalDataViewPaging', {
  extend: 'Ext.Component',
    alias: 'plugin.hdataviewpaging',

    config: {
        /**
         * @cfg {Boolean} autoPaging
         * True to automatically load the next page when you scroll to the bottom of the dataview.
         */
        autoPaging: true,

        /**
         * @cfg {String} loadMoreText The text used as the label of the Load More button.
         */
        loadMoreText: 'Load More...',

        /**
         * @cfg {String} noMoreRecordsText The text used as the label of the Load More button when the Store's
         * {@link Ext.data.Store#totalCount totalCount} indicates that all of the records available on the server are
         * already loaded
         */
        noMoreRecordsText: 'No More Records',

        /**
         * @private
         * @cfg {String} loadTpl The template used to render the load more text
         */
        loadTpl: [
            '<div class="{cssPrefix}loading-spinner" style="font-size: 180%; margin: 10px auto;">',
                 '<span class="{cssPrefix}loading-top"></span>',
                 '<span class="{cssPrefix}loading-right"></span>',
                 '<span class="{cssPrefix}loading-bottom"></span>',
                 '<span class="{cssPrefix}loading-left"></span>',
            '</div>',
            '<div class="{cssPrefix}paging-msg">{message}</div>'
        ].join(''),

        baseCls: 'ux-dataview-paging',

        width: 105,

        /**
         * @private
         * @cfg {Boolean} loadMoreCmpAdded Indicates whether or not the load more component has been added to the dataview
         * yet.
         */
        loadMoreCmpAdded: false,

        /**
         * @private
         * @cfg {String} loadingCls The CSS class that is added to the {@link #loadMoreCmp} while the Store is loading
         */
        loadingCls: Ext.baseCSSPrefix + 'loading',

        /**
         * @private
         * @cfg {Ext.dataview.DataView} dataview Local reference to the dataview this plugin is bound to
         */
        dataView: null,

        /**
         * @private
         * @cfg {Ext.scroll.Scroller} scroller Local reference to the dataview's Scroller
         */
        scroller: null,

        /**
         * @private
         * @cfg {Boolean} loading True if the plugin has initiated a Store load that has not yet completed
         */
        loading: false
    },

    /**
     * @private
     * Sets up all of the references the plugin needs
     */
    init: function(dataview) {
        var me = this,
            scroller = dataview.getScrollable().getScroller(),
            store    = dataview.getStore();

        me.setDataView(dataview);
        me.setScroller(scroller);
        me.bindStore(store);

        dataview.setScrollToTopOnRefresh(false);

        // The dataview's Store could change at any time so make sure we are informed when that happens
        dataview.updateStore = Ext.Function.createInterceptor(dataview.updateStore, me.bindStore, me);

        if (me.getAutoPaging()) {
            scroller.on({
                scrollend: me.onScrollEnd,
                scope: me
            });
        }else {
            me.on("tap",me.loadNextPage,me,{element: 'element'});    
        }

        me.addLoadMoreCmp();

        me.setHtml(me.getLoadTpl().apply({
            cssPrefix: Ext.baseCSSPrefix,
            message: this.getLoadMoreText()
        }));
    },
    /**
     * @private
     */
    bindStore: function(newStore, oldStore) {
        var listeners = {
                beforeload: this.onStoreBeforeLoad,
                addrecords: this.onStoreChanges,
                removerecords: this.onStoreChanges,
                refresh: this.onStoreRefresh,
                scope: this
            };

        if (oldStore) {
            oldStore.un(listeners);
        }

        if (newStore) {
            newStore.on(listeners);
        }
    },

    /**
     * @private
     */
    applyLoadTpl: function(config) {
        return (Ext.isObject(config) && config.isTemplate) ? config : new Ext.XTemplate(config);
    },

    /**
     * @private
     * If we're using autoPaging and detect that the user has scrolled to the bottom, kick off loading of the next page
     */
    onScrollEnd: function(scroller, x, y) {
        if (!this.getLoading() && x >= scroller.maxPosition.x) {
            this.loadNextPage();
        }
    },
    /**
     * @private
     * If the Store is just about to load but it's currently empty, we hide the load more button because this is
     * usually an outcome of setting a new Store on the dataview so we don't want the load more button to flash while
     * the new Store loads
     */
    onStoreBeforeLoad: function(store) {
        if (store.getCount() === 0) {
            this.hide();
        }
    },
    onStoreChanges: function(store,records){
        this.updateContainerSize();
    },
    /**
     * @private
     */
    onStoreRefresh: function(store) {
        var me = this,
            message  = me.storeFullyLoaded() ? me.getNoMoreRecordsText() : me.getLoadMoreText(),
            dataview = me.getDataView(),
            count = store.getCount();
        
        if(me.isHidden())
            me.show();

        
        if(store.currentPage==1){
            dataview.setLoadingText(null);
            if(me.itemWidth)
                me.getScroller().scrollToTop();

            if(!count)
                me.hide(); 
        }

        if (count){
            me.updateSizes();
        }
        
        me.setLoading(false);

        //if we've reached the end of the data set, switch to the noMoreRecordsText
        me.setHtml(me.getLoadTpl().apply({
            cssPrefix: Ext.baseCSSPrefix,
            message: message
        }));
    },

    /**
     * @private
     * Makes sure we add/remove the loading CSS class while the Store is loading
     */
    updateLoading: function(isLoading) {
        var me = this,
            loadMoreCls = me.getLoadingCls();

        if (isLoading) {
            me.addCls(loadMoreCls);
        } else {
            me.removeCls(loadMoreCls);
        }
    },
    /**
     * @private
     * Because the attached dataview's inner dataview element is rendered after our init function is called,
     * we need to dynamically add the loadMoreCmp later. This does this once and caches the result.
     */
    addLoadMoreCmp: function() {
        var dataview = this.getDataView();

        if (!this.getLoadMoreCmpAdded()) {
            dataview.add(this);

            /**
             * @event loadmorecmpadded  Fired when the Load More component is added to the dataview. Fires on the dataview.
             * @param {Ext.plugin.dataviewPaging} this The dataview paging plugin
             * @param {Ext.dataview} dataview The dataview
             */
            dataview.fireEvent('loadmorecmpadded', this, dataview);
            this.setLoadMoreCmpAdded(true);
        }
    },

    /**
     * @private
     * Returns true if the Store is detected as being fully loaded, or the server did not return a total count, which
     * means we're in 'infinite' mode
     * @return {Boolean}
     */
    storeFullyLoaded: function() {
        var store = this.getDataView().getStore(),
            total = store.getTotalCount();

        return total !== null ? store.getTotalCount() <= (store.currentPage * store.getPageSize()) : false;
    },

    /**
     * @private
     */
    loadNextPage: function() {
        if (!this.storeFullyLoaded()) {
            this.setLoading(true);
            this.getDataView().getStore().nextPage({ addRecords: true });
        }
    },
    initSizes: function(){
        var el = Ext.get(this.getDataView().getItemAt(0)),
            margin = el.getMargin();

        this.itemWidth = margin.left + margin.right + el.getWidth();
        this.setHeight(el.getHeight());
    },
    updateSizes: function(){
        if(!this.itemWidth){
            this.initSizes();
        }

        var dataview = this.getDataView(),
            left = dataview.getStore().getCount()*this.itemWidth,
            width = left + this.getWidth();

        this.element.setLeft(left)
        dataview.innerElement.setWidth(width);
    }
});

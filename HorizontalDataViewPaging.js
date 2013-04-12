/**
 * @class Ux.plugin.HorizontalDataViewPaging
 * @extend Ext.Component
 *
 * A plugin inspired from Ext.plugin.ListPaging, that adds a Load More button at the end(right) of a DataView with horizontal scrollablea and with element.Container use
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
         * @cfg {String} noMoreRecordsText The text used as the label of the Load More button when the Store's. If is null or empty then won't be shown
         * {@link Ext.data.Store#totalCount totalCount} indicates that all of the records available on the server are
         * already loaded
         */
        noMoreRecordsText: '',

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
         * @cfg {Boolean} loadMoreCmpAdded Indicates whether or not the load more component has been added to the DataView
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
         * @cfg {Ext.dataview.DataView} dataView Local reference to the DataView this plugin is bound to
         */
        dataView: null,

        /**
         * @private
         * @cfg {Ext.scroll.Scroller} scroller Local reference to the DataView's Scroller
         */
        scroller: null,

        /**
         * @private
         * @cfg {Boolean} loading True if the plugin has initiated a Store load that has not yet completed
         */
        loading: false,

        hidden: true
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
     * usually an outcome of setting a new Store on the DataView so we don't want the load more button to flash while
     * the new Store loads
     */
    onStoreBeforeLoad: function(store) {
        if (store.getCount() === 0) {
            this.hide();
        }
    },
    /**
     * @private
     */
    onStoreChanges: function(store,records){
        this.updateSizes();
    },
    /**
     * @private
     */
    onStoreRefresh: function(store) {
        var me = this;
        
        if(me.isHidden())
            me.show();

        if(store.currentPage==1){
            me.initPaging(store);
        }

        if(store.getCount()){
            me.updateSizes();
        }
        
        me.setLoading(false);

        if(me.storeFullyLoaded()){
            if(me.getNoMoreRecordsText()){
                //if we've reached the end of the data set, switch to the noMoreRecordsText
                me.setHtml(me.getLoadTpl().apply({
                    cssPrefix: Ext.baseCSSPrefix,
                    message: me.getNoMoreRecordsText()
                }));
            }else{
                me.hide();
            }
        }
    },
    /**
     * @private
     */
    initPaging: function(store) {
        var me = this;

        me.getDataView().setLoadingText(null);

        me.setHtml(me.getLoadTpl().apply({
            cssPrefix: Ext.baseCSSPrefix,
            message: me.getLoadMoreText()
        }));

        if(me.itemWidth)
            me.getScroller().scrollToTop();

        if(!store.getCount())
            me.hide(); 
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
     * Because the attached DataView's inner DataView element is rendered after our init function is called,
     * we need to dynamically add the loadMoreCmp later. This does this once and caches the result.
     */
    addLoadMoreCmp: function() {
        var dataview = this.getDataView();

        if (!this.getLoadMoreCmpAdded()) {
            dataview.add(this);

            /**
             * @event loadmorecmpadded  Fired when the Load More component is added to the DataView. Fires on the DataView.
             * @param {Ext.plugin.HorizontalDataViewPaging} this The DataView paging plugin
             * @param {Ext.DataView} dataview The DataView
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
    /**
     * @private
     */
    initSizes: function(){
        var el = Ext.get(this.getDataView().getItemAt(0)),
            margin = el.getMargin();

        this.itemWidth = margin.left + margin.right + el.getWidth();
        this.setHeight(el.getHeight());
    },
    /**
     * @private
     */
    updateSizes: function(){
        if(!this.itemWidth){
            this.initSizes();
        }

        var dataview = this.getDataView(),
            left = dataview.getStore().getCount()*this.itemWidth,
            width = left + this.getWidth();
            
        if(width > dataview.element.getWidth()){
            this.element.setLeft(left)
            dataview.innerElement.setWidth(width);
        }else{
            this.hide();
        }
    }
});
